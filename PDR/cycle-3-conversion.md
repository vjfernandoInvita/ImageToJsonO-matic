# Cycle 3 — End-to-End Conversion

---

## US-8: Submit Image for Conversion

**As a** logged-in user,
**I want** tapping "Convert to JSON" to submit my image and wait for the result,
**So that** I get structured JSON back without any manual steps.

### Acceptance Criteria
- Mobile POSTs image (multipart/form-data) to `POST /conversions` using field name **`image`**
- "Converting…" spinner shown while the request is in flight (can take 20–40s)
- "Convert to JSON" button is disabled during the request
- On success (200), app pushes to the **Result Screen** (US-9) with the returned JSON
- On error (4xx/5xx or timeout), an inline error message is shown with a **"Try Again"** option
- Mobile HTTP client timeout set to **90 seconds** via `AbortController`

### Notes
- Replace the `handleConvert()` stub in `upload.tsx` with the real API call
- Keep the `converting` state already in place — just wire it to the actual request lifecycle
- Use `AbortController` for the 90s timeout — not `Promise.race` (actually cancels the request at the network level)
- Tie the `AbortController` to a `useEffect` cleanup so navigating away mid-conversion cancels the in-flight request
- `useFocusEffect` in `upload.tsx` resets `image` state when the screen regains focus after a successful conversion; guard with a ref to skip the initial mount

---

## US-9: Result Screen

**As a** logged-in user,
**I want** a dedicated screen showing the extracted JSON,
**So that** I can review and copy the structured data.

### Acceptance Criteria
- Pushed onto the nav stack after a successful conversion; back button returns to upload screen
- Result JSON displayed in a scrollable, formatted code block
- **"Copy to Clipboard"** button copies the raw JSON string
- **"Convert Another"** button pops back to the upload screen and resets its state
- If the API returns `status: "failed"`, an error message is shown with a **"Try Again"** button that pops back to the upload screen

### Notes
- New screen at `app/(app)/result.tsx`
- JSON result passed as route params using `useLocalSearchParams<{ jobId: string; status: string; result: string; error: string }>()`
- `result` param is `JSON.stringify`-ed before passing and `JSON.parse`-d on the receiving end (Expo Router encodes all params as strings)
- `expo-clipboard` (`Clipboard.setStringAsync`) handles the copy action
- Show a brief "Copied!" label for 1.5s after copying as visual confirmation

---

## US-10: .NET API — Conversion Endpoint

**As a** system component,
**I want** a single endpoint that accepts an image and returns structured JSON,
**So that** the mobile app has a clean, simple interface.

### Acceptance Criteria
- `POST /conversions` — accepts a multipart image upload under field name **`image`**, writes it to a temp file, calls the Python agent's `POST /run` synchronously, and returns the agent result directly to the caller
- Response body:
  ```json
  {
    "jobId": "uuid",
    "status": "completed | failed",
    "result": { },
    "error": "string | null"
  }
  ```
- Temp file is cleaned up in a `finally` block after the agent call regardless of outcome; cleanup must use a non-cancellable path so it runs even if the mobile client has already disconnected
- Agent `HttpClient` timeout set to **85 seconds** (5s less than the mobile timeout, so the API returns a clean 504 ProblemDetails before the mobile `AbortController` fires)
- Agent always returns HTTP 200; failure is signaled via the `error` field — the handler must check `error` and set `status: "failed"` accordingly, not treat 200 as unconditional success
- No authentication required (deferred to Cycle 4)
- All errors returned as `ProblemDetails` (RFC 7807)
- `GET /conversions/{id}` — stubbed, returns `501 Not Implemented` (foundation for Cycle 4 job history)

### Notes
- Vertical slice under `Features/ConvertImage/` — endpoint, handler, request/response types in one folder
- Agent base URL configured via environment variable `AGENT_BASE_URL` (e.g. `http://localhost:8000`)
- `result` field in response typed as `JsonElement` (not `JsonDocument`) to avoid `IDisposable` lifetime issues
- The same `jobId` UUID generated at the endpoint boundary is sent to the agent and returned in the response — do not generate separate IDs
- `FormOptions` body size limit must be raised to cover files up to 20MB (ASP.NET Core default is 28MB but explicit configuration avoids surprises)

---

## US-11: Python Agent — Dynamic Schema Extraction

**As a** system component,
**I want** to look at any document image and return structured JSON with no hardcoded schema,
**So that** the app works on vet bills, water quality reports, invoices — anything.

### Acceptance Criteria

**`discover_schema` node:**
- Vision prompt sent to Claude Sonnet with the image
- Output: a nested key structure reflecting the document's natural hierarchy, e.g.:
  ```json
  {
    "patient": ["name", "dob", "species"],
    "visit":   ["date", "diagnosis", "treatment"],
    "billing": ["subtotal", "tax", "total"]
  }
  ```

**`extract_data` node:**
- Receives the nested schema from state
- Builds a **dynamic Pydantic model at runtime** with nested sub-models to match the discovered structure
- Re-prompts Claude Sonnet using `model.with_structured_output(DynamicModel)` with the original image
- Output: fully populated model instance written back to state

**`validate_results` node:**
- Checks coherence of extracted values: no null fields where content was clearly visible, numeric strings parse correctly, dates are plausible
- Heuristic field detection: fields whose names contain `total`, `subtotal`, `tax`, `amount`, `price`, `qty`, or `count` → expect parseable numeric; fields whose names contain `date`, `dob`, or `born` → expect parseable date
- Routes via LangGraph conditional edge:
  - `retry` → back to `extract_data` (**max 2 retries** = 3 total `extract_data` calls: 1 initial + 2 retries)
  - `done` → graph terminates, result returned to caller
- `retry_count` is incremented inside `validate_results` (not `extract_data`); the conditional edge checks `retry_count < 2` after incrementing
- If `extracted_data` is an empty dict, treat it as a validation failure (triggers retry if retries remain)
- Output: final validated JSON dict; if forced termination at max retries, partial result is still returned

**Operational:**
- FastAPI service exposing `POST /run`
- Request: `{ "image_path": "string", "job_id": "string" }` — `image_path` is an absolute filesystem path
- Response (success): `{ "job_id": "string", "result": { } }` — always HTTP 200
- Response (failure): `{ "job_id": "string", "error": "string" }` — always HTTP 200
- HTTP 4xx/5xx reserved for genuine transport/startup failures only
- All node executions traced to LangSmith (`LANGCHAIN_TRACING_V2=true`)
- `job_id` passed as `run_name` in `ainvoke` config so each graph run is identifiable in LangSmith by job ID
- Entry point: `uvicorn main:app --reload` from `agent/`

**`extracted_data` serialization shape — nested dict:**
```json
{
  "patient": { "name": "Fluffy", "dob": "2020-01-15", "species": "cat" },
  "billing": { "subtotal": "120.00", "tax": "10.00", "total": "130.00" }
}
```
All leaf values are strings (`Optional[str]`). Null fields are represented as `null`. This shape is what the `.NET API` returns in `result` and what `result.tsx` receives and renders.

### Notes
- No hardcoded schemas anywhere — the schema is entirely emergent from each image
- `discover_schema` runs exactly once per graph invocation — schema is not re-discovered on retries
- LangGraph conditional edges drive the retry loop; no manual loop logic
- Use `langchain_anthropic.ChatAnthropic` with `model="claude-sonnet-4-6"` for all LLM calls
- Image base64-encoded inline as a data URI (`data:image/jpeg;base64,...`) — no S3 or public URL required
- The API and agent share a filesystem; `image_path` is a temp file written by the API before calling the agent
- LangSmith tracing enabled via env vars only — no code changes needed; set `LANGCHAIN_TRACING_V2=false` as default in `.env.example` and enable only when key is present

---

## Scope

| In scope | Out of scope |
|---|---|
| All 3 tiers wired end-to-end | Cognito JWT auth on API (Cycle 4) |
| Dynamic nested schema — no hardcoded fields | Result history / job list (Cycle 4) |
| Dedicated result screen (`result.tsx`) | S3 image storage |
| LangSmith tracing on all agent nodes | Push notifications |
| Error handling + agent retry loop (max 2) | Auth on agent service (internal call only) |

---

## Resolved Decisions

These were open questions identified during planning. Decisions are locked — do not re-open without a PDR amendment.

| # | Decision | Resolved value |
|---|---|---|
| 1 | Multipart form field name for image | **`image`** — used by mobile `FormData.append` and bound by .NET `IFormFile image` |
| 2 | `extracted_data` serialization shape | **Nested dict** — `{ "section": { "field": "value" } }`, all leaf values `Optional[str]` |
| 3 | Max retries definition | **2 retries** = 3 total `extract_data` calls (1 initial + 2 retries); `retry_count` max is 2 |
| 4 | API `HttpClient` timeout | **85 seconds** — 5s less than mobile's 90s, so API returns clean 504 before mobile aborts |
| 5 | Mobile route param type for result screen | `useLocalSearchParams<{ jobId: string; status: string; result: string; error: string }>()` |
| 6 | Agent HTTP response on logical failure | Always **HTTP 200**; failure signaled via `error` field — HTTP 4xx/5xx for transport failures only |
| 7 | `result` field type in API response | **`JsonElement`** (not `JsonDocument`) — avoids `IDisposable` lifetime issues |
| 8 | Image delivery to agent | **Absolute filesystem path** in `image_path`; agent base64-encodes it inline — no S3 required |
| 9 | `jobId` generation | Generated once at the **API endpoint boundary**; same UUID sent to agent and returned to mobile |
| 10 | LangSmith tracing default | **Off by default** (`LANGCHAIN_TRACING_V2=false` in `.env.example`); opt-in when API key is present |
