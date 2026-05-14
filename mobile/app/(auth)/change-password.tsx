import { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { submitNewPassword } from '../../services/auth';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!code || !newPassword) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await submitNewPassword(email, code, newPassword);
      router.replace({
        pathname: '/(auth)',
        params: { message: 'Password updated. Please log in.' },
      });
    } catch (e: any) {
      setError(e.message ?? 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.subtitle}>
        Enter the code sent to your email and choose a new password.
      </Text>

      {/* Email is pre-filled and non-editable */}
      <TextInput
        style={[styles.input, styles.disabled]}
        value={email}
        editable={false}
        selectTextOnFocus={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmation Code"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
      />

      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fff',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  disabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  error: {
    color: '#c0392b',
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
