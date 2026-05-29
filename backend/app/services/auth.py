"""用户认证服务 — JWT + 密码哈希

TODO: 迁移到 SQLAlchemy User 模型（当前使用 JSON 文件作为过渡方案）
数据库 schema 已在 app/models/models.py 中定义
"""

import os
import uuid
import tempfile
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from pathlib import Path
import json

# JWT 配置
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-only-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# 密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 用户存储（JSON 文件，轻量方案）
USERS_FILE = Path("./data/users.json")


def _load_users() -> dict:
    if USERS_FILE.exists():
        return json.loads(USERS_FILE.read_text())
    return {}


def _save_users(users: dict):
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    # 原子写入：先写临时文件再 rename
    tmp_fd, tmp_path = tempfile.mkstemp(dir=USERS_FILE.parent, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, 'w') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, str(USERS_FILE))
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str | None:
    """解码 token，返回 user_id 或 None"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def register_user(username: str, password: str) -> dict | None:
    """注册用户，返回用户信息或 None（用户名已存在）"""
    users = _load_users()

    # 检查用户名是否已存在
    for uid, user in users.items():
        if user["username"] == username:
            return None

    user_id = str(uuid.uuid4())
    users[user_id] = {
        "username": username,
        "password_hash": hash_password(password),
        "created_at": datetime.utcnow().isoformat(),
    }
    _save_users(users)

    return {"user_id": user_id, "username": username}


def authenticate_user(username: str, password: str) -> dict | None:
    """验证用户，返回用户信息或 None"""
    users = _load_users()

    for uid, user in users.items():
        if user["username"] == username:
            if verify_password(password, user["password_hash"]):
                return {"user_id": uid, "username": username}
            return None

    return None


def get_user_by_id(user_id: str) -> dict | None:
    """根据 ID 获取用户"""
    users = _load_users()
    user = users.get(user_id)
    if user:
        return {"user_id": user_id, "username": user["username"]}
    return None


def update_avatar(user_id: str, avatar_path: str):
    """更新用户头像路径"""
    users = _load_users()
    if user_id in users:
        users[user_id]["avatar"] = avatar_path
        _save_users(users)
        return True
    return False


def change_password(user_id: str, old_password: str, new_password: str) -> bool:
    """修改密码"""
    users = _load_users()
    if user_id not in users:
        return False
    if not verify_password(old_password, users[user_id]["password_hash"]):
        return False
    users[user_id]["password_hash"] = hash_password(new_password)
    _save_users(users)
    return True


def get_user_detail(user_id: str) -> dict | None:
    """获取用户详细信息"""
    users = _load_users()
    user = users.get(user_id)
    if not user:
        return None
    return {
        "user_id": user_id,
        "username": user["username"],
        "avatar": user.get("avatar", ""),
        "created_at": user.get("created_at", ""),
    }
