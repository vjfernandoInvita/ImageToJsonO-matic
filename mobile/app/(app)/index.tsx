import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuthenticatedUser, logout } from '../../services/auth';

export default function LandingScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthenticatedUser()
      .then((user) => setUsername(user.username))
      .catch(() => router.replace('/(auth)'))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    router.replace('/(auth)');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {username}!</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(app)/upload')}>
        <Text style={styles.primaryButtonText}>Convert Image to JSON</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  logoutText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
});
