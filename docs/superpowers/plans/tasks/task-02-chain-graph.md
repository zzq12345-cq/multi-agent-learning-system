# Task 2: Agent 图链式协作

**Files:**
- Modify: `backend/app/agents/graph.py`

---

- [ ] **Step 1: 替换 graph.py 支持链式协作**

完整替换 `backend/app/agents/graph.py`：

```python
"""LangGraph 编排 — 多 Agent 协作图（含链式协作）"""

from langgraph.graph import StateGraph, END as GRAPH_END
from app.agents import (
    AgentState, COORDINATOR, PROFILER, PLANNER,
    GENERATOR, TUTOR, ASSESSOR, END,
)
from app.agents.coordinator import coordinator_node
from app.agents.profiler import profiler_node
from app.agents.planner import planner_node
from app.agents.generator import generator_node
from app.agents.tutor import tutor_node
from app.agents.assessor import assessor_node


def _route_after_coordinator(state: AgentState) -> str:
    """协调者之后的路由逻辑"""
    next_agent = state.get("next_agent", END)
    if next_agent == END:
        return GRAPH_END
    return next_agent


def _route_after_profiler(state: AgentState) -> str:
    """画像师完成后：如果画像已建立，自动触发规划师"""
    profile = state.get("user_profile", {})
    if profile.get("knowledge_level") and profile.get("learning_style"):
        return PLANNER
    return GRAPH_END


def _route_after_assessor(state: AgentState) -> str:
    """评估师完成后：如果有薄弱点且得分低，触发规划师调整"""
    metadata = state.get("metadata", {})
    assessment = metadata.get("last_assessment", {})
    weak_points = assessment.get("weak_points", [])
    if weak_points and assessment.get("score", 100) < 70:
        return PLANNER
    return GRAPH_END


def build_agent_graph() -> StateGraph:
    """构建多 Agent 协作图"""
    graph = StateGraph(AgentState)

    graph.add_node(COORDINATOR, coordinator_node)
    graph.add_node(PROFILER, profiler_node)
    graph.add_node(PLANNER, planner_node)
    graph.add_node(GENERATOR, generator_node)
    graph.add_node(TUTOR, tutor_node)
    graph.add_node(ASSESSOR, assessor_node)

    graph.set_entry_point(COORDINATOR)

    # 协调者 → 各 Agent
    graph.add_conditional_edges(
        COORDINATOR,
        _route_after_coordinator,
        {
            PROFILER: PROFILER,
            PLANNER: PLANNER,
            GENERATOR: GENERATOR,
            TUTOR: TUTOR,
            ASSESSOR: ASSESSOR,
            GRAPH_END: GRAPH_END,
        },
    )

    # 链式：画像师 → 可能触发规划师
    graph.add_conditional_edges(
        PROFILER,
        _route_after_profiler,
        {PLANNER: PLANNER, GRAPH_END: GRAPH_END},
    )

    # 链式：评估师 → 可能触发规划师调整
    graph.add_conditional_edges(
        ASSESSOR,
        _route_after_assessor,
        {PLANNER: PLANNER, GRAPH_END: GRAPH_END},
    )

    # 其余 Agent → 结束
    graph.add_edge(PLANNER, GRAPH_END)
    graph.add_edge(GENERATOR, GRAPH_END)
    graph.add_edge(TUTOR, GRAPH_END)

    return graph.compile()


# 全局编译好的图实例
agent_graph = build_agent_graph()
```

- [ ] **Step 2: 验证图编译**

```bash
cd backend && source venv/bin/activate
python -c "from app.agents.graph import agent_graph; print('Graph compiled OK')"
```

Expected: `Graph compiled OK`

- [ ] **Step 3: 提交**

```bash
git add backend/app/agents/graph.py
git commit -m "feat: Agent 图增加链式协作（profiler→planner, assessor→planner）"
```
