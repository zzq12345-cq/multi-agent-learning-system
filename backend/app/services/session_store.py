"""会话持久化 — JSON 文件存储"""

import json
import re
from pathlib import Path
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

STORE_DIR = Path("./data/sessions")


def _validate_session_id(session_id: str) -> bool:
    """校验 session_id 是否为合法 UUID 格式"""
    return bool(re.match(r'^[a-f0-9\-]{36}$', session_id))


def _ensure_dir():
    STORE_DIR.mkdir(parents=True, exist_ok=True)


def _serialize_messages(messages: list) -> list[dict]:
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
    if not _validate_session_id(session_id):
        return
    _ensure_dir()
    data = {
        "user_id": state.get("user_id", session_id),
        "user_profile": state.get("user_profile", {}),
        "current_intent": state.get("current_intent", ""),
        "learning_path": state.get("learning_path", {}),
        "current_node": state.get("current_node", {}),
        "node_states": state.get("node_states", {}),
        "mastery_data": state.get("mastery_data", {}),
        "agent_outputs": state.get("agent_outputs", {}),
        "metadata": state.get("metadata", {}),
        "messages": _serialize_messages(state.get("messages", [])),
    }
    filepath = STORE_DIR / f"{session_id}.json"
    filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def load_session(session_id: str) -> dict | None:
    """从文件加载会话"""
    if not _validate_session_id(session_id):
        return None
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
            "node_states": data.get("node_states", {}),
            "mastery_data": data.get("mastery_data", {}),
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
    if not _validate_session_id(session_id):
        return
    filepath = STORE_DIR / f"{session_id}.json"
    if filepath.exists():
        filepath.unlink()
