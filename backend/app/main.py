"""FastAPI 应用入口"""

from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys
from app.config import get_settings
from app.api.chat import router as chat_router
from app.api.learning import router as learning_router
from app.api.auth import router as auth_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    import os
    os.makedirs("./data", exist_ok=True)

    # 配置日志
    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level:<7} | {name}:{function}:{line} | {message}")
    logger.add("./data/app.log", rotation="10 MB", retention="7 days", level="DEBUG")
    logger.info("应用启动")

    # 初始化数据库
    from app.db.database import init_db
    await init_db()
    logger.info("数据库初始化完成")

    yield
    logger.info("应用关闭")


app = FastAPI(
    title=settings.app_name,
    description="基于大模型的个性化资源生成与学习多智能体系统",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(learning_router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "agents": ["coordinator", "profiler", "planner", "generator", "tutor", "assessor"],
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
