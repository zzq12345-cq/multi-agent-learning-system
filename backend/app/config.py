"""应用配置"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # 应用
    app_name: str = "智学多Agent - 个性化学习系统"
    debug: bool = True

    # 数据库
    database_url: str = "sqlite+aiosqlite:///./data/app.db"

    # 向量数据库
    chroma_persist_dir: str = "./data/chroma"

    # CORS
    cors_origins: list[str] = ["http://localhost:5178", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
