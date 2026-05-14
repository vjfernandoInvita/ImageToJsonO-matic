import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { getAuthenticatedUser } from '../services/auth';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    getAuthenticatedUser()
      .then(() => {
        if (segments[0] !== '(app)') router.replace('/(app)');
      })
      .catch(() => {
        if (segments[0] !== '(auth)') router.replace('/(auth)');
      });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
