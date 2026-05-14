import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create-account" options={{ headerShown: true, title: 'Create Account' }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: true, title: 'Forgot Password' }} />
      <Stack.Screen name="change-password" options={{ headerShown: true, title: 'Reset Password' }} />
    </Stack>
  );
}
