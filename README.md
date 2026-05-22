# ImageToJsonO-matic

Point your camera at any document — vet bill, water quality report, invoice — and get back a structured JSON object with no hardcoded schema. The agent discovers the structure from the image itself.

```
Mobile App (Expo)  →  .NET Web API  →  Python Agent (LangGraph + Claude Sonnet)
```

---

## Project Status

| Cycle | Feature | Status |
|---|---|---|
| 1 | Authentication (mock + Cognito) | ✅ Complete |
| 2 | Image upload screen | ✅ Complete |
| 3 | End-to-end conversion (API + Agent) | ✅ Complete |
| 4 | Auth on API, job history | 📋 Planned |

---

## Quick Start

Start all three services in **separate terminals**, in this order:

### Step 1 — Python Agent

```powershell
cd agent
pip install -r requirements.txt   # first time only

# First time: copy and fill in env vars
Copy-Item .env.example .env       # then add ANTHROPIC_API_KEY

uvicorn main:app --reload
# → http://localhost:8000
```

### Step 2 — .NET API

```powershell
cd api

# First time: restore packages (explicit source bypasses org CodeArtifact)
dotnet restore --source https://api.nuget.org/v3/index.json

$env:AGENT_BASE_URL = "http://localhost:8000"
$env:ASPNETCORE_URLS = "http://localhost:5000"
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run
# → http://localhost:5000  |  Swagger at http://localhost:5000/swagger
```

### Step 3 — Mobile App

```powershell
cd mobile
npm install                   # first time only
npx expo start --android      # emulator must already be running
```

> **Android emulator:** Open Android Studio → Device Manager → click ▶ on your AVD before running `npx expo start --android`.

---

## Prerequisites

| Tool | Purpose | Download |
|---|---|---|
| Node.js 20+ | Mobile app | [nodejs.org](https://nodejs.org) |
| Android Studio | Android emulator | [developer.android.com/studio](https://developer.android.com/studio) |
| .NET 8 SDK | Web API | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| Python 3.11+ | Agent service | [python.org](https://python.org) |
| ADB | Emulator tooling | Included with Android Studio |

Make sure `adb` is on your PATH after installing Android Studio:
```powershell
# Add to your PowerShell profile or system PATH
$env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

---

## Mobile App

### First-time setup

```powershell
cd mobile
npm install
```

> `expo-clipboard` is included in `package.json` and installed by `npm install`. No separate install step needed.

### Run on Android emulator

1. Open **Android Studio → Device Manager**
2. Click ▶ next to your AVD to boot the emulator
3. Wait for the Android home screen to appear, then:

```powershell
cd mobile
npx expo start --android
```

Expo will build the JS bundle and push it to the running emulator automatically. Press `a` in the terminal at any time to re-deploy to Android.

### Run with cache cleared (use when changes aren't appearing)

```powershell
cd mobile
npx expo start --android --clear
```

### Other targets

```powershell
npx expo start          # interactive menu — press a (Android), i (iOS), w (web)
npx expo start --ios    # iOS Simulator (Mac only)
npx expo start --web    # browser (camera not supported)
```

### Environment

Auth is set to mock mode by default — no Cognito setup needed for local development.

```
# mobile/.env
EXPO_PUBLIC_USE_MOCK_AUTH=true
```

**Mock credentials:** any email address + password `test`

To switch to real Cognito auth, set `EXPO_PUBLIC_USE_MOCK_AUTH=false` and fill in the Cognito values in `mobile/.env` (see `mobile/.env.example`).

**API base URL** — set to the Android emulator loopback by default:

```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5000
```

| Target | Value |
|---|---|
| Android emulator | `http://10.0.2.2:5000` |
| iOS Simulator | `http://localhost:5000` |
| Real device | `http://<your-LAN-IP>:5000` |

---

## Adding Photos to the Android Emulator

Camera and photo library features require images on the emulator. Three options:

### Option 1 — Drag and drop (easiest)

Drag any image file from Windows Explorer and drop it onto the emulator window. Android saves it to the gallery immediately.

### Option 2 — ADB push

```powershell
# Push an image to the emulator
adb push C:\path\to\image.jpg /sdcard/Pictures/test.jpg

# Force the media scanner to index it
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE `
  -d file:///sdcard/Pictures/test.jpg
```

If the image still doesn't appear in the gallery, insert it directly into the media store:

```powershell
adb shell content insert --uri content://media/external/images/media `
  --bind _data:s:/sdcard/Pictures/test.jpg `
  --bind mime_type:s:image/jpeg `
  --bind title:s:test
```

### Option 3 — Use your webcam for camera capture

1. Click **`...`** on the emulator side toolbar → **Extended Controls → Camera**
2. Change **Back camera** from `VirtualScene` to **Webcam**

This makes the in-app camera use your PC's webcam instead of the default 3D scene.

### If the emulator feels stuck

```powershell
# Soft reboot
adb shell reboot
```

Or in Android Studio: **Device Manager → ▼ → Cold Boot Now**

---

## .NET API

### First-time setup

```powershell
cd api
dotnet restore --source https://api.nuget.org/v3/index.json
```

> **Note:** A `NuGet.config` in `api/` pins the source to `nuget.org`. If your machine uses the org's CodeArtifact feed globally, the explicit restore above ensures standard packages resolve correctly.

### Run

```powershell
cd api
$env:AGENT_BASE_URL = "http://localhost:8000"
$env:ASPNETCORE_URLS = "http://localhost:5000"
dotnet run
```

Swagger UI available at `http://localhost:5000/swagger` when `ASPNETCORE_ENVIRONMENT=Development`.

### Other commands

```powershell
dotnet build
dotnet test
dotnet ef database update   # Cycle 4 — no migrations exist yet
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `AGENT_BASE_URL` | ✅ Yes | Python agent base URL, e.g. `http://localhost:8000` |
| `ASPNETCORE_ENVIRONMENT` | No | `Development` enables Swagger UI (default: `Production`) |
| `ASPNETCORE_URLS` | No | Override listen address (default: `http://localhost:5000`) |
| `DB_CONNECTION_STRING` | No | SQLite path (default: `Data Source=conversions.db`) |

Copy `api/.env.example` → `api/.env` and fill in values.

---

## Python Agent (Cycle 3)

```powershell
cd agent
pip install -r requirements.txt

# Copy and fill in env vars
Copy-Item .env.example .env

uvicorn main:app --reload
```

**Environment variables** (`agent/.env`):

```
ANTHROPIC_API_KEY=        # Required — Claude Sonnet API key
LANGCHAIN_TRACING_V2=false
LANGCHAIN_API_KEY=        # Optional — LangSmith tracing key
LANGCHAIN_PROJECT=        # Optional — LangSmith project name
```

```powershell
# Run agent tests
pytest
pytest -k "test_name_here"
```

---

## Project Structure

```
ImageToJsonO-matic/
├── mobile/                  # Expo React Native app
│   ├── app/
│   │   ├── (auth)/          # Login, signup, password reset
│   │   └── (app)/           # Protected screens (home, upload, result)
│   ├── services/
│   │   ├── auth.ts          # Toggle: mock ↔ Cognito
│   │   ├── auth.mock.ts     # Local secure-store mock
│   │   ├── auth.cognito.ts  # AWS Amplify / Cognito
│   │   └── api.ts           # HTTP client — POST /conversions
│   └── .env                 # Local env vars (not committed)
├── api/                     # .NET 8 Web API (Cycle 3)
│   └── Features/
│       └── ConvertImage/    # Vertical slice — endpoint + handler
├── agent/                   # Python LangGraph agent (Cycle 3)
└── PDR/                     # Product design requirements per cycle
```

---

## PDR Documents

- [`PDR/cycle-1-authentication.md`](PDR/cycle-1-authentication.md)
- [`PDR/cycle-2-image-upload.md`](PDR/cycle-2-image-upload.md)
- [`PDR/cycle-3-conversion.md`](PDR/cycle-3-conversion.md)
