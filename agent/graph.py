from langgraph.graph import StateGraph, END

from agent.state import AgentState
from agent.nodes.discover_schema import discover_schema
from agent.nodes.extract_data import extract_data
from agent.nodes.validate_results import validate_results, route_after_validation

graph = StateGraph(AgentState)
graph.add_node("discover_schema", discover_schema)
graph.add_node("extract_data", extract_data)
graph.add_node("validate_results", validate_results)
graph.set_entry_point("discover_schema")
graph.add_edge("discover_schema", "extract_data")
graph.add_edge("extract_data", "validate_results")
graph.add_conditional_edges(
    "validate_results",
    route_after_validation,
    {"retry": "extract_data", "done": END},
)
compiled_graph = graph.compile()
