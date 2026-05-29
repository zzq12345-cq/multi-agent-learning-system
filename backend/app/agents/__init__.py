"""Agent 基础定义和共享工具"""

from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI
from app.deps import LLMConfig
import operator


def get_llm(config: LLMConfig, temperature: float = 0.7) -> ChatOpenAI:
    """根据用户配置获取 LLM 实例（含超时和重试）"""
    return ChatOpenAI(
        model=config.model,
        api_key=config.api_key,
        base_url=config.base_url,
        temperature=temperature,
        streaming=True,
        request_timeout=60,
        max_retries=2,
    )


class AgentState(TypedDict):
    """全局 Agent 状态"""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    user_id: str
    user_profile: dict
    current_intent: str
    learning_path: dict
    current_node: dict
    node_states: dict  # 节点状态 {node_id: {status, score}}
    agent_outputs: dict
    next_agent: str
    metadata: dict
    llm_config: dict  # 用户 LLM 配置（序列化后）
    event_log: list  # Agent 协作事件日志


# Agent 名称常量
COORDINATOR = "coordinator"
PROFILER = "profiler"
PLANNER = "planner"
GENERATOR = "generator"
TUTOR = "tutor"
ASSESSOR = "assessor"
END = "end"
