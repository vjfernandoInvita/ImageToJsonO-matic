"""
Unit tests for individual LangGraph nodes.
All LLM calls are mocked — no real network traffic.
"""
import base64
import json
import pathlib
import tempfile
from typing import Optional
from unittest.mock import MagicMock, patch

import pytest
from pydantic import create_model

from agent.nodes.discover_schema import discover_schema
from agent.nodes.extract_data import extract_data
from agent.nodes.validate_results import route_after_validation, validate_results


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_state(overrides: dict | None = None) -> dict:
    """Return a minimal AgentState-compatible dict."""
    state = {
        "image_path": "",
        "job_id": "test-job-1",
        "image_base64": "",
        "discovered_schema": {},
        "extracted_data": {},
        "validation_errors": [],
        "retry_count": 0,
    }
    if overrides:
        state.update(overrides)
    return state


def _make_image_file(suffix: str = ".jpg") -> pathlib.Path:
    """Write a tiny fake image file and return its Path."""
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp.write(b"\xff\xd8\xff\xe0" + b"\x00" * 16)  # minimal JPEG-like bytes
    tmp.flush()
    tmp.close()
    return pathlib.Path(tmp.name)


def _fence(payload: str) -> str:
    return f"```json\n{payload}\n```"


# ---------------------------------------------------------------------------
# discover_schema
# ---------------------------------------------------------------------------


class TestDiscoverSchema:
    def test_valid_nested_json_response(self):
        """Valid ```json``` fenced response returns correct schema."""
        schema = {"patient": ["name", "dob"], "billing": ["total"]}
        fake_response = MagicMock()
        fake_response.content = _fence(json.dumps(schema))

        img_path = _make_image_file()
        state = _make_state({"image_path": str(img_path)})

        with patch("agent.nodes.discover_schema.ChatAnthropic") as MockLLM:
            MockLLM.return_value.invoke.return_value = fake_response
            result = discover_schema(state)

        assert result["discovered_schema"] == schema
        # image_base64 must be set and be valid base64
        b64 = result["image_base64"]
        assert b64
        decoded = base64.b64decode(b64)
        assert len(decoded) > 0

    def test_flat_list_response_raises(self):
        """Response containing a JSON array (not object) must raise ValueError."""
        fake_response = MagicMock()
        fake_response.content = _fence('["name", "dob"]')

        img_path = _make_image_file()
        state = _make_state({"image_path": str(img_path)})

        with patch("agent.nodes.discover_schema.ChatAnthropic") as MockLLM:
            MockLLM.return_value.invoke.return_value = fake_response
            with pytest.raises(ValueError, match="expected dict"):
                discover_schema(state)

    def test_empty_dict_response_raises(self):
        """Empty dict `{}` must raise ValueError."""
        fake_response = MagicMock()
        fake_response.content = _fence("{}")

        img_path = _make_image_file()
        state = _make_state({"image_path": str(img_path)})

        with patch("agent.nodes.discover_schema.ChatAnthropic") as MockLLM:
            MockLLM.return_value.invoke.return_value = fake_response
            with pytest.raises(ValueError, match="empty schema"):
                discover_schema(state)

    def test_no_json_fence_raises(self):
        """Response with no ```json``` fence must raise ValueError."""
        fake_response = MagicMock()
        fake_response.content = '{"patient": ["name"]}'  # no fences

        img_path = _make_image_file()
        state = _make_state({"image_path": str(img_path)})

        with patch("agent.nodes.discover_schema.ChatAnthropic") as MockLLM:
            MockLLM.return_value.invoke.return_value = fake_response
            with pytest.raises(ValueError, match="no JSON fence"):
                discover_schema(state)


# ---------------------------------------------------------------------------
# extract_data
# ---------------------------------------------------------------------------


class TestExtractData:
    def _make_document_model(self, schema: dict):
        """Build a real DocumentModel matching the schema, for use as mock return."""
        sub_models = {}
        for section, fields in schema.items():
            if not fields:
                continue
            SubModel = create_model(
                section,
                **{f: (Optional[str], None) for f in fields},
            )
            sub_models[section] = SubModel
        DocumentModel = create_model(
            "DocumentModel",
            **{s: (M, ...) for s, M in sub_models.items()},
        )
        return DocumentModel

    def test_two_section_schema_returns_nested_dict(self):
        """Schema with 2 sections returns extracted_data with correct nested structure."""
        schema = {
            "patient": ["name", "dob"],
            "billing": ["total", "tax"],
        }
        DocumentModel = self._make_document_model(schema)
        fake_instance = DocumentModel(
            patient={"name": "Fluffy", "dob": "2020-01-15"},
            billing={"total": "130.00", "tax": "10.00"},
        )

        b64 = base64.b64encode(b"\xff\xd8\xff\xe0").decode()
        state = _make_state(
            {
                "discovered_schema": schema,
                "image_base64": b64,
            }
        )

        with patch("agent.nodes.extract_data.ChatAnthropic") as MockLLM:
            mock_structured = MagicMock()
            mock_structured.invoke.return_value = fake_instance
            MockLLM.return_value.with_structured_output.return_value = mock_structured

            result = extract_data(state)

        data = result["extracted_data"]
        assert data["patient"]["name"] == "Fluffy"
        assert data["patient"]["dob"] == "2020-01-15"
        assert data["billing"]["total"] == "130.00"
        assert data["billing"]["tax"] == "10.00"

    def test_all_fields_are_optional_str(self):
        """All fields in the dynamically built sub-model are Optional[str]."""
        schema = {"section_a": ["field_x", "field_y"]}

        captured_model = {}

        def capture_model(model):
            captured_model["DocumentModel"] = model
            mock = MagicMock()
            mock.invoke.return_value = model(
                section_a={"field_x": "val", "field_y": None}
            )
            return mock

        b64 = base64.b64encode(b"\xff\xd8").decode()
        state = _make_state({"discovered_schema": schema, "image_base64": b64})

        with patch("agent.nodes.extract_data.ChatAnthropic") as MockLLM:
            MockLLM.return_value.with_structured_output.side_effect = capture_model
            extract_data(state)

        DocModel = captured_model["DocumentModel"]
        # Inspect the sub-model for section_a
        sub_field = DocModel.model_fields["section_a"]
        SubModel = sub_field.annotation
        for field_name, field_info in SubModel.model_fields.items():
            annotation = field_info.annotation
            # annotation should be Optional[str] i.e. str | None
            # Check that None is an allowed value
            import typing
            args = typing.get_args(annotation)
            assert type(None) in args, (
                f"Field '{field_name}' annotation {annotation} does not include NoneType"
            )


# ---------------------------------------------------------------------------
# validate_results
# ---------------------------------------------------------------------------


class TestValidateResults:
    def test_all_populated_no_errors(self):
        """All non-null fields with no hinted names → no errors, retry_count incremented."""
        state = _make_state(
            {
                "extracted_data": {
                    "patient": {"name": "Fluffy", "species": "cat"},
                },
                "retry_count": 0,
            }
        )
        result = validate_results(state)
        assert result["validation_errors"] == []
        assert result["retry_count"] == 1

    def test_null_field_retry_count_zero(self):
        """One null field with retry_count=0 → errors non-empty, retry_count=1."""
        state = _make_state(
            {
                "extracted_data": {
                    "patient": {"name": None, "species": "cat"},
                },
                "retry_count": 0,
            }
        )
        result = validate_results(state)
        assert len(result["validation_errors"]) > 0
        assert any("patient.name is null" in e for e in result["validation_errors"])
        assert result["retry_count"] == 1

    def test_null_field_retry_count_two(self):
        """One null field with retry_count=2 → errors non-empty, retry_count=3."""
        state = _make_state(
            {
                "extracted_data": {
                    "billing": {"total": None},
                },
                "retry_count": 2,
            }
        )
        result = validate_results(state)
        assert len(result["validation_errors"]) > 0
        assert result["retry_count"] == 3

    def test_invalid_numeric_field_flagged(self):
        """A field with a numeric hint containing a non-numeric value → error."""
        state = _make_state(
            {
                "extracted_data": {
                    "billing": {"total": "not-a-number"},
                },
                "retry_count": 0,
            }
        )
        result = validate_results(state)
        assert any("not a valid number" in e for e in result["validation_errors"])

    def test_valid_numeric_field_passes(self):
        """A field with a numeric hint containing '$130.00' → no numeric error."""
        state = _make_state(
            {
                "extracted_data": {
                    "billing": {"total": "$130.00"},
                },
                "retry_count": 0,
            }
        )
        result = validate_results(state)
        numeric_errors = [e for e in result["validation_errors"] if "not a valid number" in e]
        assert numeric_errors == []

    def test_invalid_date_field_flagged(self):
        """A field with a date hint containing garbage → error."""
        state = _make_state(
            {
                "extracted_data": {
                    "patient": {"dob": "not-a-date"},
                },
                "retry_count": 0,
            }
        )
        result = validate_results(state)
        assert any("not a recognisable date" in e for e in result["validation_errors"])

    def test_valid_date_iso_passes(self):
        """ISO 8601 date in a dob field → no date error."""
        state = _make_state(
            {
                "extracted_data": {
                    "patient": {"dob": "2020-01-15"},
                },
                "retry_count": 0,
            }
        )
        result = validate_results(state)
        date_errors = [e for e in result["validation_errors"] if "not a recognisable date" in e]
        assert date_errors == []

    def test_empty_extracted_data_flagged(self):
        """empty extracted_data → error appended."""
        state = _make_state({"extracted_data": {}, "retry_count": 0})
        result = validate_results(state)
        assert any("extracted_data is empty" in e for e in result["validation_errors"])


# ---------------------------------------------------------------------------
# route_after_validation
# ---------------------------------------------------------------------------


class TestRouteAfterValidation:
    def test_errors_and_retry_count_below_2_returns_retry(self):
        """Errors present AND retry_count < 2 → 'retry'."""
        state = _make_state({"validation_errors": ["some error"], "retry_count": 1})
        assert route_after_validation(state) == "retry"

    def test_errors_and_retry_count_zero_returns_retry(self):
        """Errors present AND retry_count == 0 → 'retry'."""
        state = _make_state({"validation_errors": ["err"], "retry_count": 0})
        assert route_after_validation(state) == "retry"

    def test_errors_and_retry_count_equals_2_returns_done(self):
        """Errors present AND retry_count == 2 → 'done'."""
        state = _make_state({"validation_errors": ["err"], "retry_count": 2})
        assert route_after_validation(state) == "done"

    def test_errors_and_retry_count_above_2_returns_done(self):
        """Errors present AND retry_count > 2 → 'done'."""
        state = _make_state({"validation_errors": ["err"], "retry_count": 3})
        assert route_after_validation(state) == "done"

    def test_no_errors_returns_done(self):
        """No errors → 'done' regardless of retry_count."""
        state = _make_state({"validation_errors": [], "retry_count": 0})
        assert route_after_validation(state) == "done"

    def test_no_errors_high_retry_count_returns_done(self):
        """No errors with high retry_count → 'done'."""
        state = _make_state({"validation_errors": [], "retry_count": 5})
        assert route_after_validation(state) == "done"
