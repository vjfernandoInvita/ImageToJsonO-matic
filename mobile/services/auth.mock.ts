import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'mock_auth_session';

interface MockSession {
  username: string;
  email: string;
}

async function saveSession(session: MockSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

async function loadSession(): Promise<MockSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? (JSON.parse(raw) as MockSession) : null;
}

async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function login(username: string, _password: string) {
  await saveSession({ username, email: username });
}

export async function createAccount(email: string, _password: string) {
  // Mock: always succeeds — no persistence needed, user will log in next
}

export async function sendPasswordResetCode(_email: string) {
  // Mock: always succeeds. Use code "123456" on the next screen.
}

export async function submitNewPassword(
  _email: string,
  code: string,
  _newPassword: string,
) {
  if (code !== '123456') {
    throw new Error('Invalid code. Use 123456 for mock testing.');
  }
}

export async function logout() {
  await clearSession();
}

export async function getAuthenticatedUser() {
  const session = await loadSession();
  if (!session) throw new Error('Not authenticated');
  return { username: session.username, userId: 'mock-user-id' };
}

export async function getAccessToken(): Promise<string | null> {
  const session = await loadSession();
  return session ? 'mock-access-token' : null;
}
