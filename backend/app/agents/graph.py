"""LangGraph 编排 — 多 Agent 协作图"""

from langgraph.graph import StateGraph, END as GRAPH_END
from app.agents import AgentState, COORDINATOR, PROFILER, PLANNER, GENERATOR, TUTOR, ASSESSOR, END
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

    graph.add_edge(PROFILER, GRAPH_END)
    graph.add_edge(PLANNER, GRAPH_END)
    graph.add_edge(GENERATOR, GRAPH_END)
    graph.add_edge(TUTOR, GRAPH_END)
    graph.add_edge(ASSESSOR, GRAPH_END)

    return graph.compile()


# 全局编译好的图实例
agent_graph = build_agent_graph()
