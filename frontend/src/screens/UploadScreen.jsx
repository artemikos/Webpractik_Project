import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Platform,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// Единая цветовая схема
const COLORS = {
  primary: '#667eea',
  primaryDark: '#764ba2',
  hired: '#4CAF50',
  background: '#f0f2f5',
  white: '#fff',
  text: '#1a1a2e',
  textLight: '#666',
  textLighter: '#999',
  card: '#fff',
};

// Условный импорт для веба
let DocumentPicker = null;
if (Platform.OS !== 'web') {
  DocumentPicker = require('react-native-document-picker').default;
}

export default function UploadScreen() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const { user } = useAuth();

  const pickDocument = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*,video/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const uri = URL.createObjectURL(file);
          await uploadFile(uri, file.name, file.type);
        }
      };
      input.click();
      return;
    }

    try {
      const { pick, types, isCancel } = DocumentPicker;
      const [result] = await pick({
        type: [types.audio, types.video],
        copyTo: 'cachesDirectory',
      });
      await uploadFile(result.fileCopyUri || result.uri, result.name, result.type || 'application/octet-stream');
    } catch (error) {
      if (!isCancel || !isCancel(error)) {
        Alert.alert('Ошибка', error.message || 'Не удалось выбрать файл');
      }
    }
  };

  const uploadFile = async (uri, name, type) => {
    setIsUploading(true);
    setUploadedFile(null);
    try {
      const response = await apiService.uploadFile(uri, name, type);
      setUploadedFile(response.file);
      Alert.alert('Успешно', 'Файл успешно загружен на сервер');
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить файл');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('audio/')) return 'audio-file';
    if (mimetype?.startsWith('video/')) return 'video-file';
    return 'insert-drive-file';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Загрузка файла</Text>
            <Text style={styles.headerSubtitle}>Аудио или видео записи собеседований</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Зона загрузки */}
        {!uploadedFile && (
          <TouchableOpacity
            style={[styles.uploadZone, isUploading && styles.uploadZoneDisabled]}
            onPress={pickDocument}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            {isUploading ? (
              <View style={styles.uploadingState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.uploadingText}>Загрузка файла...</Text>
                <Text style={styles.uploadingSubtext}>Пожалуйста, подождите</Text>
              </View>
            ) : (
              <View style={styles.uploadReady}>
                <View style={styles.uploadIconCircle}>
                  <MaterialIcons name="cloud-upload" size={48} color={COLORS.primary} />
                </View>
                <Text style={styles.uploadTitle}>Выберите файл</Text>
                <Text style={styles.uploadSubtitle}>
                  Нажмите для выбора аудио или видео файла
                </Text>
                <View style={styles.formatsRow}>
                  <View style={styles.formatBadge}>
                    <MaterialIcons name="audio-file" size={14} color={COLORS.primary} />
                    <Text style={styles.formatText}>Аудио</Text>
                  </View>
                  <View style={styles.formatBadge}>
                    <MaterialIcons name="video-file" size={14} color={COLORS.primary} />
                    <Text style={styles.formatText}>Видео</Text>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Информация о загруженном файле */}
        {uploadedFile && (
          <View style={styles.successCard}>
            <View style={styles.successHeader}>
              <View style={styles.successIcon}>
                <MaterialIcons name="check-circle" size={32} color={COLORS.hired} />
              </View>
              <View style={styles.successInfo}>
                <Text style={styles.successTitle}>Файл загружен</Text>
                <Text style={styles.successSubtitle}>Загрузка прошла успешно</Text>
              </View>
            </View>

            <View style={styles.fileCard}>
              <View style={styles.fileIconContainer}>
                <MaterialIcons
                  name={getFileIcon(uploadedFile.mimetype)}
                  size={32}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {uploadedFile.originalname}
                </Text>
                <View style={styles.fileMeta}>
                  <View style={styles.fileMetaItem}>
                    <MaterialIcons name="storage" size={12} color={COLORS.textLighter} />
                    <Text style={styles.fileMetaText}>{formatFileSize(uploadedFile.size)}</Text>
                  </View>
                  <View style={styles.fileMetaItem}>
                    <MaterialIcons name="label" size={12} color={COLORS.textLighter} />
                    <Text style={styles.fileMetaText}>{uploadedFile.mimetype}</Text>
                  </View>
                </View>
                <Text style={styles.filePath} numberOfLines={1}>
                  {uploadedFile.filename}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.uploadAnotherButton}
              onPress={() => setUploadedFile(null)}
            >
              <MaterialIcons name="add" size={20} color={COLORS.primary} />
              <Text style={styles.uploadAnotherText}>Загрузить ещё файл</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Информационный блок */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            <MaterialIcons name="info" size={16} color={COLORS.primary} /> Информация
          </Text>
          <View style={styles.infoItem}>
            <MaterialIcons name="check" size={14} color={COLORS.textLighter} />
            <Text style={styles.infoText}>Поддерживаются аудио и видео форматы</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="check" size={14} color={COLORS.textLighter} />
            <Text style={styles.infoText}>Максимальный размер файла: 10 MB</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="check" size={14} color={COLORS.textLighter} />
            <Text style={styles.infoText}>Файлы загружаются на защищённый сервер</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingTop: 20,
  },
  uploadZone: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
    marginBottom: 14,
  },
  uploadZoneDisabled: {
    opacity: 0.7,
  },
  uploadingState: {
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  uploadingSubtext: {
    fontSize: 13,
    color: COLORS.textLighter,
  },
  uploadReady: {
    alignItems: 'center',
    gap: 10,
  },
  uploadIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 12,
  },
  formatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  formatText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  successCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  successIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successInfo: {
    flex: 1,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  successSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  fileCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}05`,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },
  fileIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  fileMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  fileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  fileMetaText: {
    fontSize: 11,
    color: COLORS.textLighter,
  },
  filePath: {
    fontSize: 11,
    color: COLORS.textLighter,
    fontStyle: 'italic',
  },
  uploadAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    paddingVertical: 12,
  },
  uploadAnotherText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});