import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
  StatusBar, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiService } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const COLORS = {
  primary: '#667eea',
  primaryDark: '#764ba2',
  hired: '#4CAF50',
  offer: '#FF9800',
  rejected: '#EF5350',
  interview: '#2196F3',
  background: '#f0f2f5',
  white: '#fff',
  text: '#1a1a2e',
  textLight: '#999',
  rating: {
    excellent: '#4CAF50',
    good: '#8BC34A',
    average: '#FFC107',
    low: '#FF9800',
    poor: '#F44336',
  }
};

export default function ReportDetailScreen() {
  const route = useRoute();
  const { id } = route.params;
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('все');
  const [minRating, setMinRating] = useState('');
  const [vacancyTitle, setVacancyTitle] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigation = useNavigation();

  useEffect(() => { loadCandidates(); }, [id]);

  const loadCandidates = async () => {
    try {
      const data = await apiService.getCandidates(parseInt(id || '0'));
      setCandidates(data.items);
      setVacancyTitle(data.vacancyTitle);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить кандидатов');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusPriority = (status) => {
    switch (status) {
      case 'нанят': return 0;
      case 'офер': return 1;
      case 'Интервью': return 2;
      case 'отказ': return 3;
      default: return 4;
    }
  };

  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = [...candidates];

    if (searchQuery.trim()) {
      filtered = filtered.filter(c =>
        c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'все') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (minRating.trim()) {
      const val = parseInt(minRating);
      if (!isNaN(val)) filtered = filtered.filter(c => c.rating >= val);
    }

    return filtered.sort((a, b) => {
      const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return b.rating - a.rating;
    });
  }, [candidates, searchQuery, statusFilter, minRating]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Интервью': return COLORS.interview;
      case 'офер': return COLORS.offer;
      case 'отказ': return COLORS.rejected;
      case 'нанят': return COLORS.hired;
      default: return '#666';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'Интервью': return '#E3F2FD';
      case 'офер': return '#FFF3E0';
      case 'отказ': return '#FFEBEE';
      case 'нанят': return '#E8F5E9';
      default: return '#F5F5F5';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Интервью': return 'Интервью';
      case 'офер': return 'Договор отправлен';
      case 'отказ': return 'Отказ';
      case 'нанят': return 'Принят';
      default: return status;
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 90) return COLORS.rating.excellent;
    if (rating >= 80) return COLORS.rating.good;
    if (rating >= 70) return COLORS.rating.average;
    if (rating >= 60) return COLORS.rating.low;
    return COLORS.rating.poor;
  };

  const getRatingBgColor = (rating) => {
    if (rating >= 90) return '#E8F5E9';
    if (rating >= 80) return '#F1F8E9';
    if (rating >= 70) return '#FFF8E1';
    if (rating >= 60) return '#FFF3E0';
    return '#FFEBEE';
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const renderCandidate = ({ item }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.candidateCard}
        onPress={() => navigation.navigate('CandidateDetail', { vacancyId: id, candidateId: item.id })}
        activeOpacity={0.95}
      >
        <View style={styles.cardInner}>
          <View style={styles.cardLeft}>
            <View style={[styles.avatar, { backgroundColor: getStatusBgColor(item.status) }]}>
              <Text style={[styles.avatarText, { color: statusColor }]}>
                {getInitials(item.firstName, item.lastName)}
              </Text>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>

            <View style={styles.candidateInfo}>
              <Text style={styles.candidateName} numberOfLines={1}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={[styles.statusLabel, { color: statusColor }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.ratingCircle, { backgroundColor: getRatingBgColor(item.rating) }]}>
              <Text style={[styles.ratingNumber, { color: getRatingColor(item.rating) }]}>
                {item.rating}
              </Text>
              <Text style={[styles.ratingPercent, { color: getRatingColor(item.rating) }]}>%</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#ccc" />
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${item.rating}%`,
                  backgroundColor: getRatingColor(item.rating),
                }
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Статистика: Принят, Договор, Интервью, Отказ (без "Всего")
  const statsData = [
    { label: 'Принято', count: candidates.filter(c => c.status === 'нанят').length, color: COLORS.hired },
    { label: 'Договор', count: candidates.filter(c => c.status === 'офер').length, color: COLORS.offer },
    { label: 'Интервью', count: candidates.filter(c => c.status === 'Интервью').length, color: COLORS.interview },
    { label: 'Отказ', count: candidates.filter(c => c.status === 'отказ').length, color: COLORS.rejected },
  ];

  const activeFiltersCount = [statusFilter !== 'все', minRating.trim() !== ''].filter(Boolean).length;

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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{vacancyTitle}</Text>
          </View>
          <TouchableOpacity
            style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialIcons name="filter-list" size={20} color={COLORS.white} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Статистика: Принят, Договор, Интервью, Отказ */}
        <View style={styles.statsRow}>
          {statsData.map((stat, idx) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItem}>
                <Text style={[styles.statCount, { color: stat.color }]}>{stat.count}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              {idx < statsData.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={18} color={COLORS.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Поиск по имени..."
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filters}>
              {[
                { key: 'все', label: 'Все' },
                { key: 'нанят', label: 'Принят' },
                { key: 'офер', label: 'Договор' },
                { key: 'Интервью', label: 'Интервью' },
                { key: 'отказ', label: 'Отказ' }
              ].map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.filterChip,
                    statusFilter === item.key && styles.filterChipActive
                  ]}
                  onPress={() => setStatusFilter(item.key)}
                >
                  <Text style={[
                    styles.filterChipText,
                    statusFilter === item.key && styles.filterChipTextActive
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.ratingFilterContainer}>
              <Text style={styles.ratingFilterLabel}>Мин. рейтинг:</Text>
              <TextInput
                style={styles.ratingInput}
                placeholder="0"
                placeholderTextColor={COLORS.textLight}
                value={minRating}
                onChangeText={setMinRating}
                keyboardType="numeric"
              />
              <Text style={styles.ratingFilterPercent}>%</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <FlatList
        data={filteredAndSortedCandidates}
        renderItem={renderCandidate}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Нет кандидатов</Text>
            <Text style={styles.emptySubtitle}>Попробуйте изменить фильтры</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statCount: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filtersContainer: {
    marginTop: 10,
    gap: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  filters: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterChipActive: {
    backgroundColor: COLORS.white,
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  ratingFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingFilterLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  ratingInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    color: COLORS.text,
    width: 50,
    textAlign: 'center',
  },
  ratingFilterPercent: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  list: {
    padding: 14,
    paddingTop: 10,
    paddingBottom: 20,
  },
  candidateCard: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    padding: 14,
    overflow: 'visible',
  },
  cardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  ratingPercent: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#bbb',
  },
});