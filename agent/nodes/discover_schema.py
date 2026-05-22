import base64
import json
import pathlib

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from agent.state import AgentState


def discover_schema(state: AgentState) -> dict:
    image_path = state["image_path"]
    raw_bytes = pathlib.Path(image_path).read_bytes()
    b64_string = base64.b64encode(raw_bytes).decode("utf-8")

    suffix = pathlib.Path(image_path).suffix.lower()
    if suffix in (".jpg", ".jpeg"):
        mime_type = "image/jpeg"
    elif suffix == ".png":
        mime_type = "image/png"
    else:
        mime_type = "image/jpeg"

    message = HumanMessage(
        content=[
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime_type,
                    "data": b64_string,
                },
            },
            {
                "type": "text",
                "text": (
                    "Look at this document image carefully. Identify every logical section. "
                    "For each section, list the data field names visible within it. "
                    "Return ONLY a JSON object where each key is a section name and each value is an array of field name strings. "
                    'No values — only field names. Example: {"patient": ["name", "dob"], "billing": ["total"]}. '
                    "Wrap your response in ```json``` fences. Return nothing outside the fences."
                ),
            },
        ]
    )

    llm = ChatAnthropic(model="claude-sonnet-4-6")
    response = llm.invoke([message], config={"run_name": state["job_id"]})

    content = response.content
    fence_start = content.find("```json")
    fence_end = content.find("```", fence_start + 7)
    if fence_start == -1 or fence_end == -1:
        raise ValueError(f"discover_schema: no JSON fence found in response: {content!r}")

    raw = content[fence_start + 7 : fence_end].strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError(f"discover_schema: invalid JSON: {raw}")

    if not isinstance(result, dict):
        raise ValueError(f"discover_schema: expected dict, got {type(result)}")

    if not result:
        raise ValueError("discover_schema: empty schema returned")

    return {"image_base64": b64_string, "discovered_schema": result}
