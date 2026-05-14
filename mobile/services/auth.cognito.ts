import {
  signIn,
  signUp,
  signOut,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';

export async function login(username: string, password: string) {
  return signIn({ username, password });
}

export async function createAccount(email: string, password: string) {
  return signUp({
    username: email,
    password,
    options: { userAttributes: { email } },
  });
}

export async function sendPasswordResetCode(email: string) {
  return resetPassword({ username: email });
}

export async function submitNewPassword(
  email: string,
  code: string,
  newPassword: string,
) {
  return confirmResetPassword({ username: email, confirmationCode: code, newPassword });
}

export async function logout() {
  return signOut();
}

export async function getAuthenticatedUser() {
  return getCurrentUser();
}

export async function getAccessToken(): Promise<string | null> {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString() ?? null;
}
