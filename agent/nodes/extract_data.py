from typing import Optional

from pydantic import create_model
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from agent.state import AgentState


def extract_data(state: AgentState) -> dict:
    schema = state["discovered_schema"]
    b64 = state["image_base64"]

    sub_models = {}
    for section, fields in schema.items():
        if not fields:
            continue
        SubModel = create_model(
            section,
            **{field: (Optional[str], None) for field in fields},
        )
        sub_models[section] = SubModel

    DocumentModel = create_model(
        "DocumentModel",
        **{section: (SubModel, ...) for section, SubModel in sub_models.items()},
    )

    structured_llm = ChatAnthropic(model="claude-sonnet-4-6").with_structured_output(DocumentModel)

    message = HumanMessage(
        content=[
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": b64,
                },
            },
            {
                "type": "text",
                "text": (
                    "Extract all data from this document. "
                    "Populate every field using the exact field names in the schema. "
                    "If a field is not visible, set it to null."
                ),
            },
        ]
    )

    result = structured_llm.invoke([message], config={"run_name": state["job_id"]})
    return {"extracted_data": result.model_dump()}
