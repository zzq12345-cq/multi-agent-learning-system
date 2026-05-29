"""用户认证服务 — JWT + 密码哈希"""

import uuid
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from pathlib import Path
import json

# JWT 配置
SECRET_KEY = "multi-agent-learning-system-secret-key-2026"
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
    USERS_FILE.write_text(json.dumps(users, ensure_ascii=False, indent=2))


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
