"""FastAPI 应用入口"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api.chat import router as chat_router
from app.api.learning import router as learning_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    import os
    os.makedirs("./data", exist_ok=True)
    yield


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
