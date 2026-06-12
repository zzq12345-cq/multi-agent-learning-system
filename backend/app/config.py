"""应用配置"""

import os
import secrets
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache
from loguru import logger


def _resolve_jwt_secret() -> str:
    """JWT 密钥：优先读环境变量；未设置时生成随机密钥（仅供开发调试）"""
    secret = os.environ.get("JWT_SECRET_KEY")
    if secret:
        return secret
    logger.warning(
        "JWT_SECRET_KEY 未设置，已自动生成随机密钥：进程重启后所有旧 token 将失效，"
        "生产环境必须显式设置 JWT_SECRET_KEY 环境变量"
    )
    return secrets.token_urlsafe(48)


# JWT 签名密钥（services/auth.py 使用）
JWT_SECRET_KEY = _resolve_jwt_secret()


class Settings(BaseSettings):
    # 应用
    app_name: str = "智学多Agent - 个性化学习系统"
    debug: bool = True

    # 数据库
    database_url: str = "sqlite+aiosqlite:///./data/app.db"

    # CORS
    cors_origins: list[str] = ["http://localhost:5178", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


DATA_DIR = Path(__file__).parent.parent / "data"
