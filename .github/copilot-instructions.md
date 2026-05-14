# Copilot Instructions

## Project Overview

**ImageToJsonO-matic** is an Expo (React Native + TypeScript) mobile app for iOS and Android that converts images to JSON.

## Architecture

Three-tier system:

```
Mobile App (Expo)  →  .NET Web API  →  Python Agent Service (LangGraph)
```

1. **Mobile** — captures image, authenticates via Cognito, calls the .NET API
2. **.NET API** — handles auth, job persistence (SQLite), and forwards images to the Python agent
3. **Python Agent** — LangGraph pipeline that takes an image and returns structured JSON; the core intelligence of the app

**Mobile structure:**
- `app/` — Expo Router screens and navigation
- `components/` — Reusable UI components
- `hooks/` — Custom React hooks
- `services/` — API client calls to the .NET backend

**Backend structure:**
- `Features/ConvertImage/` — vertical slice orchestrating the conversion job
- `Infrastructure/` — EF Core DbContext, migrations, HTTP client to agent service

**Agent structure:**
- `agent/`
  - `graph.py` — LangGraph graph definition and node wiring
  - `nodes/` — `discover_schema.py`, `extract_data.py`, `validate_results.py`
  - `models.py` — Pydantic models for structured outputs

## Build & Run

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run tests
npm test

# Run a single test
npm test -- --testNamePattern="test name here"
```

## Backend API (.NET)

The backend is a separate .NET Web API project within the solution.

**Architecture: Vertical Slices + DDD**
- Each feature lives in its own slice folder (e.g., `Features/ConvertImage/`)
- A slice contains everything it needs: endpoint, handler, request/response types, domain logic
- No shared application layer — slices are self-contained
- Domain concepts (Aggregates, Value Objects, Domain Events) live within their slice
- Use MediatR for request/handler dispatch within slices

**Database: SQLite via Entity Framework Core**
- SQLite is the data store
- EF Core migrations live in `Infrastructure/Migrations/`
- `DbContext` is registered once and shared across slices

**Build & Run (API)**

```bash
# From the API project folder
dotnet run

# Apply EF migrations
dotnet ef database update

# Run backend tests
dotnet test

# Run a single test
dotnet test --filter "FullyQualifiedName~TestNameHere"
```

## AI Agent (Python / LangGraph)

The agent is a Python service that converts any document image into structured JSON with no predefined schema. It uses **LangGraph** to orchestrate a 3-node cycle and **Claude Sonnet** as the LLM.

### Node Cycle

```
discover_schema → extract_data → validate_results
                       ↑               |
                       └───────────────┘  (loop back if invalid)
```

1. **`discover_schema`** — sends the image to Sonnet and returns a list of keys found on the page (e.g., `["patient_name", "total_amount", "diagnosis"]`)
2. **`extract_data`** — takes the discovered keys, builds a dynamic Pydantic model, and re-prompts Sonnet to fill the values using structured outputs
3. **`validate_results`** — checks that extracted values are coherent (types, non-null required fields, logical consistency); routes back to `extract_data` if validation fails, or ends the graph if passing

### Key Patterns

- Dynamic Pydantic models are created at runtime from discovered keys — no hardcoded schemas
- LangGraph's conditional edges drive the retry loop in `validate_results`
- All LLM calls use `model="claude-sonnet-4-5"` (or latest Sonnet) with vision input
- Structured outputs via `model.with_structured_output(DynamicModel)`

### Build & Run (Agent)

```bash
# From the agent/ folder
pip install -r requirements.txt

# Run the agent service
uvicorn main:app --reload

# Run agent tests
pytest

# Run a single test
pytest -k "test_name_here"
```

### Observability: LangSmith

All LangGraph runs are traced in LangSmith. Set the following env vars:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=<your-langsmith-key>
LANGCHAIN_PROJECT=image-to-json-o-matic
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude Sonnet API key |
| `LANGCHAIN_API_KEY` | LangSmith tracing key |
| `LANGCHAIN_PROJECT` | LangSmith project name |
| `AWS_REGION` | `us-east-1` |
| `COGNITO_USER_POOL_ID` | For JWT validation in the .NET API |
| `COGNITO_CLIENT_ID` | Cognito app client ID |


- **Provider:** AWS Cognito (User Pools)
- **Flow:** OAuth 2.0 Authorization Code + PKCE — required for mobile clients (no client secret)
- **Tokens:** Cognito issues JWT access tokens; the API validates these on every request
- Mobile app uses `expo-auth-session` to handle the PKCE flow
- API uses ASP.NET Core JWT Bearer middleware to validate Cognito tokens
- Never use the Implicit flow or store client secrets in the mobile app

## API Design

- RESTful, stateless
- Core pattern for long-running operations (e.g., image conversion):
  - `POST /conversions` — submit image, returns `jobId`
  - `GET /conversions/{id}` — poll for result
- Errors use `ProblemDetails` (RFC 7807)

## AWS Integration

- Default region: `us-east-1`
- AWS Cognito for authentication (User Pools)
- AWS may be used for image storage (S3) or processing

## Key Conventions

**Mobile (Expo/React Native)**
- Language: TypeScript throughout (strict mode preferred)
- Use Expo SDK APIs over bare React Native APIs where possible
- File-based routing via Expo Router

**Backend (.NET)**
- One folder per feature slice under `Features/`
- No cross-slice dependencies — slices communicate via domain events or API calls only
- Keep domain logic in domain objects, not handlers
- Handlers are thin orchestrators
