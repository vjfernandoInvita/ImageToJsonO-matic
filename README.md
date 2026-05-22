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
| 3 | End-to-end conversion (API + Agent) | 🔧 In Progress |
| 4 | Auth on API, job history | 📋 Planned |

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

## .NET API (Cycle 3)

> Not yet implemented — see `PDR/cycle-3-conversion.md`

```powershell
# From the API project folder (once created)
dotnet run
dotnet ef database update
dotnet test
```

---

## Python Agent (Cycle 3)

> Not yet implemented — see `PDR/cycle-3-conversion.md`

```powershell
# From agent/
pip install -r requirements.txt

# Copy and fill in env vars
cp .env.example .env

uvicorn main:app --reload
```

**Required environment variables:**

```
ANTHROPIC_API_KEY=        # Claude Sonnet API key
LANGCHAIN_API_KEY=        # LangSmith tracing key
LANGCHAIN_PROJECT=        # LangSmith project name
LANGCHAIN_TRACING_V2=true
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
│   │   └── auth.cognito.ts  # AWS Amplify / Cognito
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
