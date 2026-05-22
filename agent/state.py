from typing import TypedDict


class AgentState(TypedDict):
    image_path: str
    job_id: str
    image_base64: str        # set by discover_schema, reused by extract_data
    discovered_schema: dict  # { "section": ["field", ...] }
    extracted_data: dict     # { "section": { "field": "value" } }
    validation_errors: list[str]
    retry_count: int
