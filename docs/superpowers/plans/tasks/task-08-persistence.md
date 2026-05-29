# Task 8: 会话持久化（JSON 文件存储）

**Files:**
- Create: `backend/app/services/session_store.py`
- Modify: `backend/app/api/chat.py`（替换内存 sessions）
- Modify: `backend/app/main.py`（启动时加载）

---

- [ ] **Step 1: 创建 session_store.py**

创建 `backend/app/services/__init__.py`（空文件）和 `backend/app/services/session_store.py`：

```python
"""会话持久化 — JSON 文件存储"""

import json
import os
from pathlib import Path
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

STORE_DIR = Path("./data/sessions")


def _ensure_dir():
    STORE_DIR.mkdir(parents=True, exist_ok=True)


def _serialize_messages(messages: list[BaseMessage]) -> list[dict]:
    """将 LangChain 消息序列化为 JSON"""
    result = []
    for m in messages:
        result.append({
            "type": m.type,
            "content": m.content,
            "name": getattr(m, "name", None),
        })
    return result


def _deserialize_messages(data: list[dict]) -> list[BaseMessage]:
    """从 JSON 反序列化为 LangChain 消息"""
    messages = []
    for d in data:
        if d["type"] == "human":
            messages.append(HumanMessage(content=d["content"]))
        elif d["type"] == "ai":
            messages.append(AIMessage(content=d["content"], name=d.get("name")))
    return messages


def save_session(session_id: str, state: dict):
    """保存会话到文件"""
    _ensure_dir()
    data = {
        "user_id": state.get("user_id", session_id),
        "user_profile": state.get("user_profile", {}),
        "current_intent": state.get("current_intent", ""),
        "learning_path": state.get("learning_path", {}),
        "current_node": state.get("current_node", {}),
        "agent_outputs": state.get("agent_outputs", {}),
        "metadata": state.get("metadata", {}),
        "messages": _serialize_messages(state.get("messages", [])),
    }
    filepath = STORE_DIR / f"{session_id}.json"
    filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def load_session(session_id: str) -> dict | None:
    """从文件加载会话"""
    filepath = STORE_DIR / f"{session_id}.json"
    if not filepath.exists():
        return None
    try:
        data = json.loads(filepath.read_text())
        return {
            "messages": _deserialize_messages(data.get("messages", [])),
            "user_id": data.get("user_id", session_id),
            "user_profile": data.get("user_profile", {}),
            "current_intent": data.get("current_intent", ""),
            "learning_path": data.get("learning_path", {}),
            "current_node": data.get("current_node", {}),
            "agent_outputs": data.get("agent_outputs", {}),
            "next_agent": "",
            "metadata": data.get("metadata", {}),
            "llm_config": {},
            "event_log": [],
        }
    except (json.JSONDecodeError, KeyError):
        return None


def list_sessions() -> list[str]:
    """列出所有会话 ID"""
    _ensure_dir()
    return [f.stem for f in STORE_DIR.glob("*.json")]


def delete_session_file(session_id: str):
    """删除会话文件"""
    filepath = STORE_DIR / f"{session_id}.json"
    if filepath.exists():
        filepath.unlink()
```

- [ ] **Step 2: 修改 chat.py 集成持久化**

在 `backend/app/api/chat.py` 顶部增加导入：

```python
from app.services.session_store import save_session, load_session, delete_session_file
```

修改 `sessions.get()` 调用处，增加文件加载回退：

在 `send_message` 和 `websocket_chat` 中，将：
```python
state = sessions.get(session_id, _create_initial_state(session_id))
```
改为：
```python
state = sessions.get(session_id) or load_session(session_id) or _create_initial_state(session_id)
```

在每次 `sessions[session_id] = result` 之后，增加：
```python
save_session(session_id, result)
```

在 `delete_session` 中增加：
```python
delete_session_file(session_id)
```

- [ ] **Step 3: 创建空 __init__.py**

```bash
touch backend/app/services/__init__.py
```

- [ ] **Step 4: 验证**

```bash
cd backend && source venv/bin/activate
python -c "from app.services.session_store import save_session, load_session; print('Store OK')"
```

- [ ] **Step 5: 提交**

```bash
git add backend/app/services/ backend/app/api/chat.py
git commit -m "feat: 会话持久化（JSON 文件存储，支持重启恢复）"
```
