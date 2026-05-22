# Cycle 2 — Image Upload

---

## US-5: Upload Screen

**As a** logged-in user,
**I want** to select an image from my camera or photo library,
**So that** I can submit it for JSON conversion.

### Acceptance Criteria
- A **"Take Photo"** button opens the device camera; on capture, the image is passed to the preview state
- A **"Choose from Library"** button opens the native photo picker; on selection, the image is passed to the preview state
- The app requests camera and media library permissions before opening either picker; if denied, an inline message explains why the feature is unavailable
- If the user cancels the picker without selecting, the screen remains unchanged

### Notes
- Use `expo-image-picker` for both camera and gallery access
- Request permissions lazily (at the moment the user taps, not on screen mount)
- Images are cropped to a 1:1 aspect ratio; quality is set to 0.8 to balance fidelity and upload size

---

## US-6: Image Preview

**As a** logged-in user,
**I want** to review the image I selected before submitting it,
**So that** I can confirm I picked the right one or choose a different one.

### Acceptance Criteria
- After selecting or capturing an image, a full-width preview of the image is displayed
- A **"Choose Different"** button replaces the preview with the picker options (returns to US-5 state)
- The **"Convert to JSON"** button (US-7) is only visible once an image has been selected

---

## US-7: Convert to JSON (Stub)

**As a** logged-in user,
**I want** to tap a button to submit my image for conversion,
**So that** the app can return structured JSON data.

### Acceptance Criteria
- A **"Convert to JSON"** primary action button is displayed below the image preview
- Tapping the button shows a **"Coming in a future update"** toast or inline message (backend not yet implemented)
- The button is disabled while a submission is in flight (loading state — for future use)

### Notes
- The actual `POST /conversions` call and result polling will be implemented in Cycle 3
- The stub state should be easy to replace: the button's `onPress` handler should call a `handleConvert()` function that can be wired to the real API without changing UI structure
