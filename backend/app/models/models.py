"""数据模型定义"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="user", uselist=False)
    learning_paths = relationship("LearningPath", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")


class StudentProfile(Base):
    """学生画像"""
    __tablename__ = "student_profiles"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True)
    learning_style = Column(String(20), default="balanced")  # visual/practical/theoretical/balanced
    knowledge_level = Column(String(20), default="beginner")  # beginner/intermediate/advanced
    goals = Column(JSON, default=list)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    preferences = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class LearningPath(Base):
    """学习路径"""
    __tablename__ = "learning_paths"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    domain = Column(String(50))  # 学科领域
    nodes = Column(JSON, default=list)  # 知识点节点列表
    edges = Column(JSON, default=list)  # 节点间关系
    current_node_id = Column(String(36))  # 当前学习节点
    progress = Column(Float, default=0.0)  # 0.0 ~ 1.0
    status = Column(String(20), default="active")  # active/completed/paused
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="learning_paths")
    node_progress = relationship("NodeProgress", back_populates="learning_path")


class NodeProgress(Base):
    """知识点学习进度"""
    __tablename__ = "node_progress"

    id = Column(String(36), primary_key=True)
    learning_path_id = Column(String(36), ForeignKey("learning_paths.id"))
    node_id = Column(String(36), nullable=False)
    status = Column(String(20), default="locked")  # locked/available/in_progress/completed
    score = Column(Float)  # 评估得分
    attempts = Column(Integer, default=0)
    completed_at = Column(DateTime)

    learning_path = relationship("LearningPath", back_populates="node_progress")


class Conversation(Base):
    """对话会话"""
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    title = Column(String(200))
    context = Column(JSON, default=dict)  # 对话上下文（当前学习节点等）
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    """对话消息"""
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id"))
    role = Column(String(20), nullable=False)  # user/assistant/system/agent
    agent_name = Column(String(50))  # 哪个 Agent 产生的
    content = Column(Text, nullable=False)
    metadata = Column(JSON, default=dict)  # Agent 协作元数据
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class GeneratedResource(Base):
    """生成的学习资源"""
    __tablename__ = "generated_resources"

    id = Column(String(36), primary_key=True)
    node_id = Column(String(36), nullable=False)
    resource_type = Column(String(30), nullable=False)  # note/exercise/quiz/code_example/summary
    title = Column(String(200))
    content = Column(Text, nullable=False)
    difficulty = Column(Integer, default=1)  # 1-5
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
