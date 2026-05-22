"""
Integration smoke test: runs the full compiled graph with mocked LLM calls.
"""
import base64
import json
import pathlib
import tempfile
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import create_model

from agent.graph import compiled_graph


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_image_file() -> pathlib.Path:
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    tmp.write(b"\xff\xd8\xff\xe0" + b"\x00" * 16)
    tmp.flush()
    tmp.close()
    return pathlib.Path(tmp.name)


def _build_document_model(schema: dict):
    sub_models = {}
    for section, fields in schema.items():
        SubModel = create_model(
            section,
            **{f: (Optional[str], None) for f in fields},
        )
        sub_models[section] = SubModel
    return create_model(
        "DocumentModel",
        **{s: (M, ...) for s, M in sub_models.items()},
    )


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_graph_smoke():
    """
    Run the full compiled graph end-to-end with both LLM calls mocked.
    Assert that extracted_data is a non-empty dict.
    """
    schema = {
        "patient": ["name", "species"],
        "billing": ["total"],
    }
    DocumentModel = _build_document_model(schema)
    fake_instance = DocumentModel(
        patient={"name": "Fluffy", "species": "cat"},
        billing={"total": "130.00"},
    )

    img_path = _make_image_file()
    b64 = base64.b64encode(img_path.read_bytes()).decode()

    # --- Mock for discover_schema (plain invoke) ---
    discover_response = MagicMock()
    discover_response.content = f"```json\n{json.dumps(schema)}\n```"

    # --- Mock for extract_data (structured_output invoke) ---
    structured_mock = MagicMock()
    structured_mock.invoke.return_value = fake_instance

    call_count = 0

    def llm_factory(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        mock_llm = MagicMock()
        if call_count == 1:
            # First instantiation → discover_schema call
            mock_llm.invoke.return_value = discover_response
        else:
            # Subsequent instantiation → extract_data call (with_structured_output)
            mock_llm.with_structured_output.return_value = structured_mock
        return mock_llm

    initial_state = {
        "image_path": str(img_path),
        "job_id": "smoke-test-job",
        "image_base64": "",
        "discovered_schema": {},
        "extracted_data": {},
        "validation_errors": [],
        "retry_count": 0,
    }

    with patch("agent.nodes.discover_schema.ChatAnthropic", side_effect=llm_factory), \
         patch("agent.nodes.extract_data.ChatAnthropic", side_effect=llm_factory):
        final_state = await compiled_graph.ainvoke(
            initial_state,
            config={"run_name": "smoke-test-job"},
        )

    extracted = final_state["extracted_data"]
    assert isinstance(extracted, dict), "extracted_data must be a dict"
    assert len(extracted) > 0, "extracted_data must be non-empty"
    assert extracted["patient"]["name"] == "Fluffy"
    assert extracted["billing"]["total"] == "130.00"
