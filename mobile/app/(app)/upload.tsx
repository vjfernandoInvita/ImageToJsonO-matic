import { useState } from 'react';
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
import { useRouter } from 'expo-router';

type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

export default function UploadScreen() {
  const router = useRouter();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [converting, setConverting] = useState(false);

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
    // Cycle 3: wire this to POST /conversions and poll GET /conversions/{id}
    setConverting(true);
    await new Promise((resolve) => setTimeout(resolve, 400)); // simulate tap feedback
    setConverting(false);
    Alert.alert('Coming Soon', 'JSON conversion will be available in a future update.');
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
});
