from datetime import datetime

from agent.state import AgentState

NUMERIC_HINTS = {"total", "subtotal", "tax", "amount", "price", "qty", "count"}
DATE_HINTS = {"date", "dob", "born"}
DATE_FORMATS = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%B %d, %Y", "%d %B %Y"]


def validate_results(state: AgentState) -> dict:
    data = state["extracted_data"]
    errors: list[str] = []

    if not data:
        errors.append("extracted_data is empty")

    for section, fields in data.items():
        for field, value in fields.items():
            if value is None:
                errors.append(f"{section}.{field} is null")
            else:
                field_lower = field.lower()
                if any(hint in field_lower for hint in NUMERIC_HINTS):
                    try:
                        float(
                            str(value)
                            .replace(",", "")
                            .replace("$", "")
                            .replace("£", "")
                            .strip()
                        )
                    except ValueError:
                        errors.append(
                            f"{section}.{field} is not a valid number: {value!r}"
                        )
                if any(hint in field_lower for hint in DATE_HINTS):
                    parsed = False
                    for fmt in DATE_FORMATS:
                        try:
                            datetime.strptime(str(value), fmt)
                            parsed = True
                            break
                        except ValueError:
                            continue
                    if not parsed:
                        errors.append(
                            f"{section}.{field} is not a recognisable date: {value!r}"
                        )

    retry_count = state["retry_count"] + 1
    return {"validation_errors": errors, "retry_count": retry_count}


def route_after_validation(state: AgentState) -> str:
    if state["validation_errors"] and state["retry_count"] < 2:
        return "retry"
    return "done"
