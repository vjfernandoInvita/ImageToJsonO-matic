import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

type ResultParams = {
  jobId: string;
  status: string;
  result: string;
  error: string;
};

export default function ResultScreen() {
  const router = useRouter();
  const { status, result, error } = useLocalSearchParams<ResultParams>();
  const [copied, setCopied] = useState(false);

  let formattedJson: string;
  try {
    formattedJson = JSON.stringify(JSON.parse(result ?? '{}'), null, 2);
  } catch {
    formattedJson = result ?? '';
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(result ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Result</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {status === 'completed' ? (
        <View style={styles.content}>
          <ScrollView
            style={styles.codeScrollView}
            contentContainerStyle={styles.codeScrollContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>{formattedJson}</Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, copied && styles.primaryButtonCopied]}
              onPress={handleCopy}
            >
              <Text style={styles.primaryButtonText}>
                {copied ? 'Copied! ✓' : 'Copy to Clipboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>Convert Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.failedContent}>
          <Text style={styles.failedIcon}>✗</Text>
          <Text style={styles.failedHeading}>Conversion Failed</Text>
          <Text style={styles.failedDetail}>{error || 'An error occurred during conversion.'}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backLink: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '600',
    width: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  codeScrollView: {
    flex: 1,
    marginBottom: 24,
  },
  codeScrollContent: {
    flexGrow: 1,
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#d4d4d4',
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonCopied: {
    backgroundColor: '#16a34a',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  failedContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  failedIcon: {
    fontSize: 64,
    color: '#dc2626',
    marginBottom: 16,
  },
  failedHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  failedDetail: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
});
