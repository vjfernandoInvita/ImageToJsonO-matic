# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ImageToJsonO-matic** converts document images to structured JSON. Three-tier architecture:

```
Mobile App (Expo)  →  .NET Web API  →  Python Agent Service (LangGraph)
```

**Cycles 1–3 are complete.** Cycle 4 (auth on API + job history) is next.

| Cycle | Feature | Status |
|---|---|---|
| 1 | Authentication (mock + Cognito) | ✅ Complete |
| 2 | Image upload screen | ✅ Complete |
| 3 | End-to-end conversion (API + Agent) | ✅ Complete |
| 4 | Auth on API, job history | 📋 Planned |

## Session Startup

Start all three services in separate terminals. **Order matters** — agent first, then API, then mobile.

### 1. Python Agent

```powershell
cd agent
# First time only:
pip install -r requirements.txt
cp .env.example .env   # then fill in ANTHROPIC_API_KEY

uvicorn main:app --reload
# Listening on http://localhost:8000
```

### 2. .NET API

```powershell
cd api
# First time only (use explicit source to bypass org CodeArtifact):
dotnet restore --source https://api.nuget.org/v3/index.json
cp .env.example .env   # or set env vars manually (see below)

$env:AGENT_BASE_URL = "http://localhost:8000"
$env:ASPNETCORE_URLS = "http://localhost:5000"
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run
# Swagger UI at http://localhost:5000/swagger
```

> **NuGet note:** `api/NuGet.config` pins the source to `nuget.org`. This is required because the org's CodeArtifact feed needs SSO auth that isn't available in the terminal. Always pass `--source https://api.nuget.org/v3/index.json` on the first restore for a new machine.

### 3. Mobile App

```powershell
cd mobile
# First time only:
npm install

npx expo start --android
# Press 'a' anytime to re-deploy to the running Android emulator
```

**Android emulator must be running first** (Android Studio → Device Manager → ▶).

## Commands

All mobile commands run from the `mobile/` directory.

```bash
# Install
npm install

# Dev server
npx expo start
npx expo start --ios
npx expo start --android

# Tests
npm test
npm test -- --testNamePattern="test name here"
```

**Backend (.NET) — from the API project folder:**
```bash
dotnet run
dotnet ef database update
dotnet test
dotnet test --filter "FullyQualifiedName~TestNameHere"
```

**Agent (Python) — from `agent/`:**
```bash
pip install -r requirements.txt
uvicorn main:app --reload
pytest
pytest -k "test_name_here"
```

## Architecture

### Mobile (`mobile/`)

Expo Router with **group-based file routing**:

- `app/(auth)/` — public screens (login, signup, forgot/change password); root layout redirects unauthenticated users here
- `app/(app)/` — protected screens; root layout redirects authenticated users here
- `services/auth.ts` — re-export toggle between `auth.mock.ts` (dev) and `auth.cognito.ts` (prod), controlled by `EXPO_PUBLIC_USE_MOCK_AUTH`

**Auth toggle:** Set `EXPO_PUBLIC_USE_MOCK_AUTH=true` in `mobile/.env` to use local secure-store mock. Switch to `false` and fill in Cognito credentials (see `mobile/.env.example`) for production.

Mock password reset code is `"123456"`.

### .NET API (`api/`)

**Vertical Slice + DDD pattern:**
- One folder per feature under `Features/` (e.g., `Features/ConvertImage/`)
- Each slice is self-contained: endpoint, handler, request/response types, domain logic
- No cross-slice dependencies — slices communicate via domain events or API calls only
- MediatR for request/handler dispatch; single shared EF Core DbContext
- SQLite via Entity Framework Core; migrations in `Infrastructure/Migrations/`

**API contract:**
- `POST /conversions` — submit image → returns `jobId`
- `GET /conversions/{id}` — poll for result
- Errors use `ProblemDetails` (RFC 7807)

### Python Agent (`agent/`)

LangGraph pipeline in `agent/`:

```
discover_schema → extract_data → validate_results
                      ↑               |
                      └───────────────┘  (retry loop if invalid)
```

- `discover_schema` — vision prompt → list of keys found in the image
- `extract_data` — builds a **dynamic Pydantic model at runtime** from discovered keys, re-prompts with `model.with_structured_output(DynamicModel)` for values
- `validate_results` — validates coherence; routes back to `extract_data` or terminates via LangGraph conditional edges

All LLM calls use Claude Sonnet with vision input. Traces go to LangSmith when `LANGCHAIN_TRACING_V2=true` (off by default in `.env.example`).

## README Maintenance

**Always update `README.md` when any of the following change:**
- A new screen, endpoint, or agent node is added or removed
- Setup steps change (new dependencies, env vars, commands)
- A cycle moves from planned → in progress → complete
- The project structure changes (new folders, renamed files)
- New tooling is introduced (e.g. a new test runner, a migration command)

The README is the single source of truth for anyone setting up the project. Keep it current as part of every implementation task — not as a separate follow-up.

## Key Conventions

**Mobile (TypeScript/Expo):**
- TypeScript strict mode throughout
- Prefer Expo SDK APIs over bare React Native equivalents
- Tokens persisted in `expo-secure-store` (never AsyncStorage)
- Auth flow: OAuth 2.0 Authorization Code + PKCE (no client secrets in the app)

**Backend (.NET):**
- Domain logic in domain objects; handlers are thin orchestrators
- One DbContext, shared across all slices

**Agent (Python):**
- No hardcoded schemas — discover keys from each image dynamically
- LangGraph conditional edges drive retry loops, not manual loops

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_USE_MOCK_AUTH` | `mobile/.env` | `true` = mock auth, `false` = Cognito |
| `EXPO_PUBLIC_COGNITO_USER_POOL_ID` | `mobile/.env` | Cognito User Pool ID |
| `EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID` | `mobile/.env` | Cognito App Client ID |
| `EXPO_PUBLIC_AWS_REGION` | `mobile/.env` | Default `us-east-1` |
| `ANTHROPIC_API_KEY` | agent `.env` | Claude Sonnet API key |
| `LANGCHAIN_API_KEY` | agent `.env` | LangSmith tracing key |
| `LANGCHAIN_PROJECT` | agent `.env` | LangSmith project name |
| `COGNITO_USER_POOL_ID` | API `.env` | JWT validation in .NET API |
| `COGNITO_CLIENT_ID` | API `.env` | Cognito app client ID |
