"""知识掌握度模型 — 细粒度知识点级别追踪"""

import time
import math

from app.services.learning_engine import index_by_node_name, normalize_node_name


# 遗忘曲线参数（艾宾浩斯）
DECAY_RATE = 0.1  # 衰减速率
MIN_MASTERY = 10  # 最低掌握度（不会完全遗忘）
MASTERY_THRESHOLD = 70  # 掌握阈值（高于此视为已掌握）


def calculate_mastery_decay(mastery: float, last_review_ts: float, now_ts: float = None) -> float:
    """计算遗忘曲线衰减后的掌握度

    公式：M(t) = max(MIN, M0 * e^(-λt))
    t 以天为单位
    """
    if now_ts is None:
        now_ts = time.time()

    days_elapsed = (now_ts - last_review_ts) / 86400
    if days_elapsed <= 0:
        return mastery

    decayed = mastery * math.exp(-DECAY_RATE * days_elapsed)
    return max(MIN_MASTERY, round(decayed, 1))


def update_mastery(current: float, score: float, attempt: int = 1) -> float:
    """根据评估得分更新掌握度

    策略：
    - 得分高于当前掌握度：提升（加权平均偏向新分数）
    - 得分低于当前掌握度：小幅下降
    - 多次尝试有衰减（避免刷分）
    """
    attempt_factor = 1.0 / (1 + 0.2 * (attempt - 1))  # 多次尝试权重递减

    if score >= current:
        # 提升：70% 新分数 + 30% 旧分数
        new_mastery = current * 0.3 + score * 0.7 * attempt_factor
    else:
        # 下降：小幅调整
        new_mastery = current * 0.8 + score * 0.2

    return round(min(100, max(0, new_mastery)), 1)


def get_weak_points(mastery_data: dict, threshold: float = MASTERY_THRESHOLD) -> list[str]:
    """获取薄弱知识点（掌握度低于阈值）"""
    weak = []
    for node_id, data in mastery_data.items():
        mastery = data.get("mastery", 0)
        if mastery < threshold:
            weak.append(node_id)
    return weak


def get_review_suggestions(mastery_data: dict, now_ts: float = None) -> list[str]:
    """获取需要复习的知识点（掌握度衰减后低于阈值）"""
    if now_ts is None:
        now_ts = time.time()

    suggestions = []
    for node_id, data in mastery_data.items():
        mastery = data.get("mastery", 0)
        last_review = data.get("last_review_ts", now_ts)

        current_mastery = calculate_mastery_decay(mastery, last_review, now_ts)
        if current_mastery < MASTERY_THRESHOLD and mastery >= MASTERY_THRESHOLD:
            # 曾经掌握但已遗忘
            suggestions.append(node_id)

    return suggestions


def init_mastery_data(learning_path: dict) -> dict:
    """根据学习路径初始化掌握度数据"""
    nodes = learning_path.get("nodes", [])
    now = time.time()
    return {
        node["id"]: {
            "mastery": 0,
            "attempts": 0,
            "last_review_ts": now,
            "history": [],  # [{score, timestamp}]
        }
        for node in nodes
    }


def merge_mastery_data(learning_path: dict, old_data: dict, old_nodes: list) -> dict:
    """调整路径后合并掌握度：按节点名称匹配，同名节点保留历史

    以名称而非 LLM 生成的 id（node_1 风格）为合并键，避免跨主题
    重新规划时旧掌握度嫁接到新节点；名称不重合的节点全新初始化。
    """
    old_by_name = index_by_node_name(old_data, old_nodes)
    fresh = init_mastery_data(learning_path)
    return {
        node["id"]: old_by_name.get(normalize_node_name(node.get("name", "")), fresh[node["id"]])
        for node in learning_path.get("nodes", [])
    }


def record_assessment(mastery_data: dict, node_id: str, score: float) -> dict:
    """记录一次评估结果，更新掌握度"""
    updated = {**mastery_data}
    now = time.time()

    if node_id not in updated:
        updated[node_id] = {"mastery": 0, "attempts": 0, "last_review_ts": now, "history": []}

    node_data = {**updated[node_id]}
    node_data["attempts"] = node_data.get("attempts", 0) + 1
    node_data["mastery"] = update_mastery(
        node_data.get("mastery", 0), score, node_data["attempts"]
    )
    node_data["last_review_ts"] = now

    history = list(node_data.get("history", []))
    history.append({"score": score, "timestamp": now})
    node_data["history"] = history[-10:]  # 只保留最近 10 次

    updated[node_id] = node_data
    return updated
