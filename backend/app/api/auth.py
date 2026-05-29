"""用户认证 API"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.auth import (
    register_user, authenticate_user, create_access_token,
    decode_token, get_user_by_id,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    user_id: str
    username: str
    token: str


class UserInfo(BaseModel):
    user_id: str
    username: str


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    """用户注册"""
    if len(req.username) < 2 or len(req.password) < 4:
        raise HTTPException(400, "用户名至少 2 字符，密码至少 4 字符")

    user = register_user(req.username, req.password)
    if not user:
        raise HTTPException(409, "用户名已存在")

    token = create_access_token(user["user_id"])
    return AuthResponse(
        user_id=user["user_id"], username=user["username"], token=token
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """用户登录"""
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(401, "用户名或密码错误")

    token = create_access_token(user["user_id"])
    return AuthResponse(
        user_id=user["user_id"], username=user["username"], token=token
    )


@router.get("/me", response_model=UserInfo)
async def get_me(authorization: str = Header(default="")):
    """获取当前用户信息"""
    token = (
        authorization.replace("Bearer ", "")
        if authorization.startswith("Bearer ")
        else authorization
    )
    if not token:
        raise HTTPException(401, "未提供认证 token")

    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "token 无效或已过期")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "用户不存在")

    return UserInfo(user_id=user["user_id"], username=user["username"])
