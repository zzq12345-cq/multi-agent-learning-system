"""用户认证测试"""

import tempfile
from pathlib import Path
from unittest.mock import patch
from app.services.auth import (
    hash_password, verify_password,
    create_access_token, decode_token,
    register_user, authenticate_user,
)


def test_password_hash():
    hashed = hash_password("test123")
    assert verify_password("test123", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_token():
    token = create_access_token("user-123")
    user_id = decode_token(token)
    assert user_id == "user-123"


def test_jwt_invalid():
    result = decode_token("invalid.token.here")
    assert result is None


def test_register_and_login():
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w") as f:
        f.write("{}")
        f.flush()
        with patch("app.services.auth.USERS_FILE", Path(f.name)):
            # 注册
            user = register_user("testuser", "pass123")
            assert user is not None
            assert user["username"] == "testuser"

            # 重复注册
            dup = register_user("testuser", "other")
            assert dup is None

            # 登录
            auth = authenticate_user("testuser", "pass123")
            assert auth is not None

            # 错误密码
            bad = authenticate_user("testuser", "wrong")
            assert bad is None
