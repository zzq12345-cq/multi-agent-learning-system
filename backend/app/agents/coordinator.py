"""协调者 Agent — 意图识别和任务分发（增强版）"""

from langchain_core.messages import AIMessage, SystemMessage
from app.agents import AgentState, get_llm, PROFILER, PLANNER, GENERATOR, TUTOR, ASSESSOR, END
from app.deps import LLMConfig
from app.services.memory import build_context_summary, get_conversation_window

COORDINATOR_PROMPT = """你是一个智能学习系统的协调者（Coordinator Agent）。
你的职责是理解用户意图，并将任务分发给合适的专业 Agent。

可用的 Agent：
- profiler: 评估学生能力水平、识别学习风格（用于新用户或需要重新评估时）
- planner: 规划学习路径、调整学习计划（用于开始新学科或调整路径时）
- generator: 生成学习资源（讲义、练习题、代码示例）
- tutor: 实时答疑、概念解释、引导思考
- assessor: 学习效果评估、生成测试题、评判答案

判断规则：
1. 用户想开始学习新内容/新学科 → planner
2. 用户问具体知识问题/需要解释/说"不理解" → tutor
3. 用户想做练习/测试/说"测试一下" → assessor
4. 用户想获取学习资料/笔记/说"生成"/"给我" → generator
5. 用户是新用户/想重新评估水平/说"评估" → profiler
6. 用户回答了测试题目（选 A/B/C/D 或给出答案） → assessor
7. 用户说"继续"/"下一个"/"下一步" → 如果有学习路径则 generator，否则 planner
8. 用户说"复习"/"回顾" → assessor
9. 简单的问候/闲聊 → 直接回复（以 REPLY: 开头）

当前学生画像：{profile}
当前学习路径：{path}
当前节点进度：{progress}

请只回复一个 Agent 名称（profiler/planner/generator/tutor/assessor），
或者如果是简单对话直接回复用户（以 REPLY: 开头）。"""

# 路由表：Agent 名称 → 节点 ID
AGENT_MAP = {
    "profiler": PROFILER,
    "planner": PLANNER,
    "generator": GENERATOR,
    "tutor": TUTOR,
    "assessor": ASSESSOR,
}

# 精确匹配时容忍的包裹字符（引号、标点、Markdown 符号等）
_WRAP_CHARS = "\"'`*#·「」『』（）()【】[]。.，,：:？?！! \n\r\t"


def _resolve_route(content: str) -> tuple[str | None, float]:
    """解析路由目标（入参须为小写文本）：返回 (目标, 置信度)"""
    if "reply:" in content:
        return None, 1.0
    exact = content.strip(_WRAP_CHARS)
    if exact in AGENT_MAP:
        return AGENT_MAP[exact], 0.95
    # 子串匹配：命中多个 Agent 名时视为普通回复，不强行路由
    hits = [name for name in AGENT_MAP if name in content]
    if len(hits) == 1:
        return AGENT_MAP[hits[0]], 0.85
    return None, 0.7


def _extract_reply(raw_content: str) -> str:
    """提取直接回复文本：保留原文大小写，仅剥离 REPLY: 前缀"""
    idx = raw_content.lower().find("reply:")
    if idx >= 0:
        return raw_content[idx + len("reply:"):].strip()
    return raw_content


async def coordinator_node(state: AgentState) -> dict:
    """协调者节点：识别意图并路由"""
    config = LLMConfig(**state.get("llm_config", {}))
    # 意图分类任务，temperature 设 0 保证路由稳定
    llm = get_llm(config, temperature=0)

    profile_info = state.get("user_profile", {})
    path_info = state.get("learning_path", {})
    node_states = state.get("node_states", {})

    # 构建进度摘要
    progress = "无"
    if node_states:
        completed = sum(
            1 for v in node_states.values() if v.get("status") == "completed"
        )
        total = len(node_states)
        in_progress = [
            k for k, v in node_states.items() if v.get("status") == "in_progress"
        ]
        progress = f"已完成 {completed}/{total}"
        if in_progress:
            progress += f"，当前学习: {in_progress[0]}"

    context_summary = build_context_summary(state)
    system_msg = SystemMessage(content=COORDINATOR_PROMPT.format(
        profile=profile_info or "未建立",
        path=path_info.get("title", "未设置") if path_info else "未设置",
        progress=progress,
    ) + f"\n\n--- 当前上下文 ---\n{context_summary}")

    recent_messages = get_conversation_window(state["messages"], max_recent=3, max_total=6)
    response = await llm.ainvoke([system_msg] + list(recent_messages))
    # 保留原文用于直接回复，仅用小写副本做路由判定
    raw_content = response.content.strip()

    target, confidence = _resolve_route(raw_content.lower())
    if target:
        import json
        coordinator_output = json.dumps({
            "reasoning": raw_content[:80],
            "confidence": confidence
        }, ensure_ascii=False)
        return {
            "current_intent": target,
            "next_agent": target,
            "agent_outputs": {
                **state.get("agent_outputs", {}),
                "coordinator": coordinator_output,
            },
        }

    # 直接回复
    return {
        "messages": [AIMessage(content=_extract_reply(raw_content), name="coordinator")],
        "next_agent": END,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "coordinator": json.dumps({"reasoning": "直接回复", "confidence": 1.0}, ensure_ascii=False),
        },
    }
