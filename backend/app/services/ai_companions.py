"""AI 学伴引擎 — 明确标注 is_ai 的虚拟学习伙伴，为社区提供真实感活跃度

设计要点：
- 不调用 LLM：动态与评论全部来自人设模板库，毫秒级同步完成
- 惰性推进：仅在 feed/leaderboard 被访问时按时间差结算学习进度
- 状态持久化在 data/social/companions.json，复用 social.py 的文件锁读写
"""

import fcntl
import random
import time
import uuid
import zlib
from contextlib import contextmanager
from pathlib import Path

from app.services import social

COMPANIONS_FILE = Path("./data/social") / "companions.json"
TICK_LOCK_FILE = Path("./data/social") / ".companions.lock"

HOUR = 3600
MAX_ACTS_PER_SETTLE = 3          # 单学伴单次结算最多补 3 条动态，防刷屏
RESPOND_DELAY_SECONDS = 60       # 用户动态发布超过 60 秒后学伴才回应
BACKFILL_WINDOW = 24 * HOUR      # 首次初始化回填过去 24 小时
COMMENT_PROBABILITY = 0.7        # 学伴评论用户动态的概率
COMMENT_DELAY_RANGE = (60, 600)  # 评论时间设在动态发布后 1-10 分钟
HIGH_SCORE_THRESHOLD = 85        # 高于该分用夸奖模板，否则用鼓励模板

# 4 个 AI 学伴人设：pace_hours 为单节点耗时区间（小时），均落在全局 6-10h 内
COMPANIONS = [
    {"id": "ai-xiaozhu", "name": "小竹", "domain": "python",
     "pace_hours": (7.0, 9.0), "score_range": (70, 85)},
    {"id": "ai-ayuan", "name": "阿源", "domain": "web",
     "pace_hours": (7.0, 9.5), "score_range": (80, 92)},
    {"id": "ai-nova", "name": "Nova", "domain": "datastructure",
     "pace_hours": (6.0, 7.5), "score_range": (88, 100)},
    {"id": "ai-susu", "name": "苏苏", "domain": "python",
     "pace_hours": (8.5, 10.0), "score_range": (75, 90)},
]

# 学伴发布动态的内容模板（按人设语气区分）
POST_TEMPLATES = {
    "ai-xiaozhu": [
        "磕磕绊绊总算完成了「{node}」，得分 {score}，文科生也能学编程！",
        "今天搞懂了「{node}」，得分 {score}，错题都记在小本本上了～",
        "「{node}」打卡完成，得分 {score}，比昨天进步一点点也是进步！",
    ],
    "ai-ayuan": [
        "完成「{node}」，得分 {score}，设计师转行写代码，审美和逻辑都要在线。",
        "「{node}」学完了，得分 {score}，回头找个小项目练练手。",
        "搞定「{node}」，得分 {score}，这块在实际项目里太常用了。",
    ],
    "ai-nova": [
        "「{node}」done，{score} 分。",
        "完成「{node}」，得分 {score}，复杂度已推导。",
        "「{node}」通关，{score} 分，下一个。",
    ],
    "ai-susu": [
        "慢慢学完了「{node}」，得分 {score}，稳扎稳打最重要呀。",
        "今天完成「{node}」，得分 {score}，大家一起加油哦～",
        "「{node}」学完啦，得分 {score}，温故而知新。",
    ],
}

# 学伴评论模板库：praise 高分夸 / encourage 一般分鼓励 / cheer 其他事件
COMMENT_TEMPLATES = {
    "ai-xiaozhu": {
        "praise": [
            "{score} 分！大佬带带我，「{node}」我还没学到呢！",
            "哇「{node}」拿了 {score} 分，也太强了吧！",
            "羡慕！我学「{node}」的时候错了好多次……",
        ],
        "encourage": [
            "「{node}」我也觉得有点难，一起加油呀！",
            "没事没事，我也经常犯小错，多练几遍就好啦！",
            "能坚持学完「{node}」就很棒了，继续冲！",
        ],
        "cheer": ["好耶！一起学习呀～", "欢迎欢迎，社区又热闹啦！", "哇，向你看齐！"],
    },
    "ai-ayuan": {
        "praise": [
            "「{node}」拿 {score} 分，基础扎实，做项目肯定顺。",
            "{score} 分不错啊，这个知识点我当时也花了不少功夫。",
            "「{node}」掌握到这个程度，可以试着上手真实需求了。",
        ],
        "encourage": [
            "「{node}」确实绕，多写两个 demo 就通了。",
            "别灰心，我转行那会儿也是反复啃这块。",
            "建议把「{node}」用到一个小练习里，理解会快很多。",
        ],
        "cheer": ["欢迎入伙，一起搬砖一起学！", "这个路径选得很实用。", "不错不错，节奏保持住。"],
    },
    "ai-nova": {
        "praise": [
            "{score} 分，稳。",
            "「{node}」这个分数，可以挑战进阶题了。",
            "效率不错，建议趁热复盘一遍「{node}」。",
        ],
        "encourage": [
            "「{node}」核心就几个套路，刷三道题就熟了。",
            "分数不重要，把「{node}」的边界情况想清楚更重要。",
            "卡住就画图，「{node}」一画就懂。",
        ],
        "cheer": ["开始即胜利。", "路径不错，执行最关键。", "保持节奏。"],
    },
    "ai-susu": {
        "praise": [
            "「{node}」拿了 {score} 分，真的很棒，请继续保持哦！",
            "{score} 分！学姐都要向你学习啦～",
            "好厉害！「{node}」学得这么扎实，后面会越来越顺的。",
        ],
        "encourage": [
            "「{node}」慢慢来没关系的，理解比分数重要哦。",
            "每一次练习都算数，别着急，学姐陪你一起学～",
            "已经很努力啦，「{node}」再复习一遍就稳了。",
        ],
        "cheer": ["欢迎你呀，一起慢慢变强～", "为你开心！继续加油哦。", "坚持的样子最棒啦！"],
    },
}


def _get_graph(domain: str) -> dict:
    """按领域取预置知识图谱（纯数据，无副作用）"""
    from app.knowledge.python_graph import PYTHON_KNOWLEDGE_GRAPH
    from app.knowledge.web_graph import WEB_KNOWLEDGE_GRAPH
    from app.knowledge.datastructure_graph import DS_KNOWLEDGE_GRAPH
    return {
        "python": PYTHON_KNOWLEDGE_GRAPH,
        "web": WEB_KNOWLEDGE_GRAPH,
        "datastructure": DS_KNOWLEDGE_GRAPH,
    }[domain]


@contextmanager
def _tick_lock():
    """跨进程独占锁：结算与回应是「读-改-写」整表操作，多 worker/多副本
    共享 data 卷时必须互斥，否则会重复回填动态、互相覆盖写"""
    TICK_LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TICK_LOCK_FILE, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _node_interval(comp: dict, abs_index: int) -> float:
    """单节点学习耗时（秒）：人设节奏区间 + id/序号哈希抖动，错开各学伴"""
    lo, hi = comp["pace_hours"]
    jitter = zlib.crc32(f"{comp['id']}:{abs_index}".encode()) % 1000 / 1000
    return (lo + (hi - lo) * jitter) * HOUR


def _node_activity(comp: dict, node: dict, score: int, ts: float, graph: dict) -> dict:
    """构造一条学伴「完成节点」动态"""
    template = random.choice(POST_TEMPLATES[comp["id"]])
    return {
        "id": str(uuid.uuid4()),
        "user_id": comp["id"],
        "username": comp["name"],
        "is_ai": True,
        "type": "node_completed",
        "content": template.format(node=node["name"], score=score),
        "metadata": {
            "node_id": node["id"], "node_name": node["name"], "score": score,
            "domain": comp["domain"], "path_title": graph["title"],
        },
        "likes": 0, "liked_by": [], "comments": [],
        "timestamp": ts,
    }


def _path_activity(comp: dict, graph: dict, ts: float) -> dict:
    """构造一条学伴「学完整条路径」动态"""
    return {
        "id": str(uuid.uuid4()),
        "user_id": comp["id"],
        "username": comp["name"],
        "is_ai": True,
        "type": "path_completed",
        "content": f"完成了「{graph['title']}」全部 {len(graph['nodes'])} 个节点，开启新一轮复习！",
        "metadata": {"domain": comp["domain"], "path_title": graph["title"]},
        "likes": 0, "liked_by": [], "comments": [],
        "timestamp": ts,
    }


def _init_companion(comp: dict, now: float) -> tuple[dict, list[dict]]:
    """首次初始化：回填过去 24 小时 2-3 条动态，避免社区页空白"""
    graph = _get_graph(comp["domain"])
    nodes = graph["nodes"]
    count = 2 + zlib.crc32(comp["id"].encode()) % 2
    acts, score_sum = [], 0
    for i in range(count):
        ts = now - BACKFILL_WINDOW * (count - i) / (count + 1)
        score = random.randint(*comp["score_range"])
        score_sum += score
        acts.append(_node_activity(comp, nodes[i], score, ts, graph))
    state = {
        "node_index": count, "round": 0, "last_ts": acts[-1]["timestamp"],
        "score_sum": score_sum, "score_count": count,
    }
    return state, acts


def _settle(comp: dict, cstate: dict, now: float) -> list[dict]:
    """按时间差推进单个学伴，返回新生成的动态列表（原地更新 cstate）"""
    graph = _get_graph(comp["domain"])
    nodes = graph["nodes"]
    acts = []
    while len(acts) < MAX_ACTS_PER_SETTLE:
        abs_index = cstate.get("round", 0) * len(nodes) + cstate.get("node_index", 0)
        interval = _node_interval(comp, abs_index)
        if now - cstate["last_ts"] < interval:
            break
        ts = cstate["last_ts"] + interval
        score = random.randint(*comp["score_range"])
        acts.append(_node_activity(comp, nodes[cstate.get("node_index", 0)], score, ts, graph))
        cstate["last_ts"] = ts
        cstate["node_index"] = cstate.get("node_index", 0) + 1
        cstate["score_sum"] = cstate.get("score_sum", 0) + score
        cstate["score_count"] = cstate.get("score_count", 0) + 1
        if cstate["node_index"] >= len(nodes):
            # 一条路径学完：庆祝动态无条件补发（允许超出单次上限 1 条，
            # 否则批次恰好满载时会被永久丢失）；ts+1 保证排序在节点动态之后
            cstate["node_index"] = 0
            cstate["round"] = cstate.get("round", 0) + 1
            acts.append(_path_activity(comp, graph, ts + 1))
    if len(acts) >= MAX_ACTS_PER_SETTLE:
        next_abs = cstate.get("round", 0) * len(nodes) + cstate.get("node_index", 0)
        if now - cstate["last_ts"] >= _node_interval(comp, next_abs):
            cstate["last_ts"] = now  # 丢弃积压进度，防止下次访问刷屏
    return acts


def advance_companions(now: float | None = None) -> int:
    """惰性结算所有学伴进度，返回新生成的动态条数"""
    now = now or time.time()
    with _tick_lock():
        state = social._read_json_locked(COMPANIONS_FILE) or {}
        new_acts = []
        for comp in COMPANIONS:
            cstate = state.get(comp["id"])
            if cstate is None:
                cstate, acts = _init_companion(comp, now)
                state[comp["id"]] = cstate
            else:
                acts = _settle(comp, cstate, now)
            new_acts.extend(acts)
        if new_acts:
            social._write_json_locked(COMPANIONS_FILE, state)
            activities = social._load_activities()
            activities.extend(new_acts)
            activities.sort(key=lambda a: a.get("timestamp", 0), reverse=True)
            social._save_activities(activities[:200])
    return len(new_acts)


def _render_comment(comp: dict, act: dict) -> str:
    """按事件类型与得分选模板并插值（高分夸、低分鼓励）"""
    md = act.get("metadata", {})
    buckets = COMMENT_TEMPLATES[comp["id"]]
    if act.get("type") == "node_completed":
        score = md.get("score")
        is_high = isinstance(score, (int, float)) and score >= HIGH_SCORE_THRESHOLD
        templates = buckets["praise"] if is_high else buckets["encourage"]
    else:
        templates = buckets["cheer"]
    return random.choice(templates).format(
        node=md.get("node_name", "这个知识点"),
        score=md.get("score", ""),
        path=md.get("path_title", "学习路径"),
    )


def _respond_one(act: dict, now: float):
    """单条动态的学伴回应：1-2 个点赞、0-1 个评论"""
    for comp in random.sample(COMPANIONS, k=random.randint(1, 2)):
        liked_by = act.setdefault("liked_by", [])
        if comp["id"] not in liked_by:
            liked_by.append(comp["id"])
            act["likes"] = act.get("likes", 0) + 1
    if random.random() >= COMMENT_PROBABILITY:
        return
    # 苏苏是评论担当，加倍出现权重
    pool = COMPANIONS + [c for c in COMPANIONS if c["id"] == "ai-susu"]
    comp = random.choice(pool)
    act.setdefault("comments", []).append({
        "author_id": comp["id"],
        "author_name": comp["name"],
        "is_ai": True,
        "content": _render_comment(comp, act),
        "timestamp": min(act.get("timestamp", now) + random.uniform(*COMMENT_DELAY_RANGE), now),
    })


def respond_to_user_activities(now: float | None = None) -> int:
    """让学伴回应真实用户的未回应动态（ai_responded 标记保证幂等）"""
    now = now or time.time()
    with _tick_lock():
        activities = social._load_activities()
        responded = 0
        for act in activities:
            if act.get("is_ai") or str(act.get("user_id", "")).startswith("ai-"):
                continue
            if act.get("ai_responded") or now - act.get("timestamp", 0) < RESPOND_DELAY_SECONDS:
                continue
            _respond_one(act, now)
            act["ai_responded"] = True
            responded += 1
        if responded:
            social._save_activities(activities)
    return responded


def get_companion_leaderboard_entries() -> list[dict]:
    """学伴排行榜条目（口径与 calculate_leaderboard 一致，标注 is_ai）"""
    state = social._read_json_locked(COMPANIONS_FILE) or {}
    entries = []
    for comp in COMPANIONS:
        cstate = state.get(comp["id"])
        if not cstate:
            continue
        nodes_total = len(_get_graph(comp["domain"])["nodes"])
        # 单路径口径饱和：跨轮累计会让学伴分数无上限增长、永久霸榜，
        # 封顶在一条路径规模内，与真实用户（单路径节点数）可比可超越
        completed = min(
            cstate.get("round", 0) * nodes_total + cstate.get("node_index", 0),
            nodes_total,
        )
        count = cstate.get("score_count", 0)
        avg = cstate.get("score_sum", 0) / count if count else sum(comp["score_range"]) / 2
        # 学习天数按 1 天简化，与真实用户口径一致
        score = completed * 0.4 + avg * 0.4 + 1 * 0.2
        entries.append({
            "user_id": comp["id"], "username": comp["name"], "is_ai": True,
            "score": round(score, 1),
            "completed": completed,
            "avg_mastery": round(avg, 1),
        })
    return entries
