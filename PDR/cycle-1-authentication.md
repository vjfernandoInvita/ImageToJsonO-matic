# Cycle 1 — Authentication

---

## US-1: Login Screen

**As a** user,
**I want** to log in with my username and password,
**So that** I can securely access the app.

### Acceptance Criteria
- Screen has a **username** field and a **password** field (masked)
- A **Login** button submits credentials to AWS Cognito
- On success, user is navigated to the Landing Screen (US-4)
- On failure, a descriptive inline error is shown (e.g., "Incorrect username or password")
- A **"Create Account"** link navigates to the Create Account screen (US-2)
- A **"Forgot Password?"** link navigates to the Forgot Password screen (US-3)

### Notes
- Auth via AWS Cognito using OAuth 2.0 Authorization Code + PKCE (`expo-auth-session`)
- No biometric login in this cycle

---

## US-2: Create Account Screen

**As a** new user,
**I want** to create an account with my email and password,
**So that** I can register and access the app.

### Acceptance Criteria
- Screen has an **email** field and a **password** field (masked)
- A **Create Account** button submits to Cognito to register the user
- Password must meet Cognito's policy (min 8 chars; show requirements to the user)
- On success, user is navigated to the Login screen with a confirmation message (e.g., "Account created! Please log in.")
- On failure, inline error is shown (e.g., "An account with this email already exists")
- A **"Back to Login"** link navigates back to US-1

### Notes
- Cognito handles email verification — verification email is sent automatically
- No phone/social login in this cycle

---

## US-3: Forgot Password Flow

**As a** user who forgot their password,
**I want** to reset my password via email,
**So that** I can regain access to my account.

### Flow
1. **Request Screen** — user enters their email and taps **"Send Recovery Link"**
   - On success, a confirmation message is shown and user is navigated to the Change Password screen
   - On failure (email not found), inline error is shown
2. **Change Password Screen** — user enters the code received by email and a new password
   - **Username/email field** is pre-filled, grayed out, and non-editable
   - **Confirmation code** field (from the email)
   - **New password** field (masked, with policy requirements shown)
   - A **"Submit"** button confirms the reset via Cognito
   - On success, navigate to Login screen with message "Password updated. Please log in."

### Notes
- Uses Cognito's built-in `forgotPassword` + `confirmForgotPassword` flow
- No in-app deep link handling needed in this cycle (user manually enters the code)

---

## US-4: Landing Screen

**As a** logged-in user,
**I want** to see a welcome screen after logging in,
**So that** I know I've successfully entered the app.

### Acceptance Criteria
- Displays the text **"Welcome, [username]"** where username is pulled from the Cognito JWT
- Acts as a placeholder — full functionality to be built in later cycles
- User session is persisted (token stored securely; user is not logged out on app restart)

### Notes
- Use `expo-secure-store` for token storage
- This screen will be replaced/extended in a future cycle
