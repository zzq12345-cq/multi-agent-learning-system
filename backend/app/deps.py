"""依赖注入 — LLM 配置（后端固定配置）"""

from dataclasses import dataclass
from fastapi import Request


@dataclass
class LLMConfig:
    """LLM 配置"""
    api_key: str = "zhou2005627"
    base_url: str = "https://api.zhouzhiqi.site/v1"
    model: str = "deepseek-v4-flash"


def get_llm_config(request: Request | None = None) -> LLMConfig:
    """获取 LLM 配置（后端固定）"""
    return LLMConfig()
