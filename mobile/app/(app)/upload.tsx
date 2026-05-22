import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { convertImage } from '../../services/api';

type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

export default function UploadScreen() {
  const router = useRouter();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const convertedRef = useRef(false);

  // Cancel any in-flight request when the component unmounts
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Reset image and error when regaining focus after a successful conversion
  useFocusEffect(
    useCallback(() => {
      if (convertedRef.current) {
        setImage(null);
        setError(null);
        convertedRef.current = false;
      }
    }, []),
  );

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Needed',
        'Grant camera permission in Settings to take photos.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImage({ uri: asset.uri, width: asset.width, height: asset.height });
    }
  }

  async function handleChooseFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Access Needed',
        'Grant photo library permission in Settings to pick images.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImage({ uri: asset.uri, width: asset.width, height: asset.height });
    }
  }

  async function handleConvert() {
    if (!image) return;

    setConverting(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', {
      uri: image.uri,
      name: 'upload.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    try {
      const result = await convertImage(formData);

      if (result.status === 'completed') {
        convertedRef.current = true;
        router.push({
          pathname: '/(app)/result',
          params: {
            jobId: result.jobId,
            status: result.status,
            result: JSON.stringify(result.result),
            error: '',
          },
        });
      } else {
        setError(result.error ?? 'Conversion failed.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setConverting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Convert Image</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {image ? (
          <>
            <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setImage(null)}>
              <Text style={styles.secondaryButtonText}>Choose Different Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, converting && styles.primaryButtonDisabled]}
              onPress={handleConvert}
              disabled={converting}
            >
              <Text style={styles.primaryButtonText}>
                {converting ? 'Converting…' : 'Convert to JSON'}
              </Text>
            </TouchableOpacity>

            {error !== null && (
              <>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setError(null);
                    handleConvert();
                  }}
                >
                  <Text style={styles.tryAgainText}>Try Again</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>🖼️</Text>
              <Text style={styles.placeholderLabel}>No image selected</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleTakePhoto}>
              <Text style={styles.primaryButtonText}>Take Photo</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleChooseFromLibrary}>
                <Text style={styles.secondaryButtonText}>Choose from Library</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
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
    paddingTop: 32,
    alignItems: 'center',
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#f9fafb',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderLabel: {
    fontSize: 15,
    color: '#9ca3af',
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: '#93c5fd',
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
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  tryAgainText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
});
