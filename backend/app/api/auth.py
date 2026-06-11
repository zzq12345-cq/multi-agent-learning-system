"""用户认证 API"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File
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

    # 社交：发布加入社区动态（失败不影响注册）
    try:
        from app.services.social import post_activity
        post_activity(
            user["user_id"], user["username"], "joined", "加入了智学社区", {}
        )
    except Exception:
        pass

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


@router.get("/profile")
async def get_profile(authorization: str = Header(default="")):
    """获取用户详细信息"""
    token = (
        authorization.replace("Bearer ", "")
        if authorization.startswith("Bearer ")
        else authorization
    )
    if not token:
        raise HTTPException(401, "未提供认证 token")
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "token 无效")

    from app.services.auth import get_user_detail
    user = get_user_detail(user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    return user


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...), authorization: str = Header(default="")
):
    """上传头像"""
    token = (
        authorization.replace("Bearer ", "")
        if authorization.startswith("Bearer ")
        else authorization
    )
    if not token:
        raise HTTPException(401, "未提供认证 token")
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "token 无效")

    # 校验文件类型
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "仅支持图片文件")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "图片大小不能超过 5MB")

    # 保存头像
    import os
    from pathlib import Path

    avatar_dir = Path("./data/avatars")
    avatar_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "avatar.png").suffix or ".png"
    filename = f"{user_id}{ext}"
    filepath = avatar_dir / filename
    filepath.write_bytes(content)

    # 更新用户记录
    from app.services.auth import update_avatar

    avatar_url = f"/api/auth/avatars/{filename}"
    update_avatar(user_id, avatar_url)

    return {"avatar": avatar_url}


@router.get("/avatars/{filename}")
async def get_avatar(filename: str):
    """获取头像文件"""
    from fastapi.responses import FileResponse
    from pathlib import Path

    filepath = Path("./data/avatars") / filename
    if not filepath.exists():
        raise HTTPException(404, "头像不存在")
    return FileResponse(filepath)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def api_change_password(
    req: ChangePasswordRequest, authorization: str = Header(default="")
):
    """修改密码"""
    token = (
        authorization.replace("Bearer ", "")
        if authorization.startswith("Bearer ")
        else authorization
    )
    if not token:
        raise HTTPException(401, "未提供认证 token")
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "token 无效")

    from app.services.auth import change_password

    if not change_password(user_id, req.old_password, req.new_password):
        raise HTTPException(400, "原密码错误")
    return {"status": "ok"}
