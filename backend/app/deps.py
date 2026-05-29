"""依赖注入 — LLM 配置"""

import os
from dataclasses import dataclass, field
from fastapi import Request


@dataclass
class LLMConfig:
    """LLM 配置"""
    api_key: str = field(default_factory=lambda: os.environ.get("LLM_API_KEY", ""))
    base_url: str = field(default_factory=lambda: os.environ.get("LLM_BASE_URL", "https://api.deepseek.com/v1"))
    model: str = field(default_factory=lambda: os.environ.get("LLM_MODEL", "deepseek-chat"))


def get_llm_config(request: Request | None = None) -> LLMConfig:
    """获取 LLM 配置"""
    return LLMConfig()
