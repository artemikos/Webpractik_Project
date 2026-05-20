import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, TextInput,
  StatusBar, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// Единая цветовая схема
const COLORS = {
  primary: '#667eea',
  primaryDark: '#764ba2',
  open: '#4CAF50',
  pause: '#FF9800',
  closed: '#EF5350',
  background: '#f0f2f5',
  white: '#fff',
  text: '#1a1a2e',
  textLight: '#999',
};

export default function ReportsScreen() {
  const [vacancies, setVacancies] = useState([]);
  const [filteredVacancies, setFilteredVacancies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('все');
  const [showFilters, setShowFilters] = useState(false);
  const { logout } = useAuth();
  const navigation = useNavigation();

  useEffect(() => { loadVacancies(); }, []);
  useEffect(() => { applyFilters(); }, [vacancies, searchQuery, statusFilter]);

  const loadVacancies = async () => {
    try {
      const data = await apiService.getVacancies();
      setVacancies(data.items);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить вакансии');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...vacancies];
    if (searchQuery.trim()) {
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'все') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }
    setFilteredVacancies(filtered);
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'открыта': return COLORS.open;
      case 'пауза': return COLORS.pause;
      case 'закрыта': return COLORS.closed;
      default: return '#666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'открыта': return 'Открыта';
      case 'пауза': return 'Остановлена';
      case 'закрыта': return 'Закрыта';
      default: return status;
    }
  };

  const getDepartmentIcon = (department) => {
    switch (department) {
      case 'analytics': return 'analytics';
      case 'r&d': return 'code';
      case 'product': return 'rocket-launch';
      case 'design': return 'palette';
      default: return 'work';
    }
  };

  const activeFiltersCount = [statusFilter !== 'все', searchQuery.trim() !== ''].filter(Boolean).length;

  const renderVacancy = ({ item }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.vacancyCard}
        onPress={() => navigation.navigate('ReportDetail', { id: item.id })}
        activeOpacity={0.95}
      >
        <View style={styles.vacancyContent}>
          <View style={styles.vacancyHeader}>
            <View style={[styles.departmentIcon, { backgroundColor: `${COLORS.primary}15` }]}>
              <MaterialIcons
                name={getDepartmentIcon(item.department)}
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.vacancyInfo}>
              <Text style={styles.vacancyTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.vacancyMeta}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                </View>
                <View style={styles.candidatesCount}>
                  <MaterialIcons name="people" size={13} color={COLORS.primary} />
                  <Text style={styles.candidatesCountText}>{item.candidatesCount}</Text>
                </View>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#ccc" />
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

  // Статистика использует те же цвета что и статусы
  const statsData = [
    { label: 'Всего', count: vacancies.length, color: COLORS.white },
    { label: 'Открыто', count: vacancies.filter(v => v.status === 'открыта').length, color: COLORS.open },
    { label: 'Пауза', count: vacancies.filter(v => v.status === 'пауза').length, color: COLORS.pause },
    { label: 'Закрыто', count: vacancies.filter(v => v.status === 'закрыта').length, color: COLORS.closed },
  ];

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
            <Text style={styles.headerTitle}>Вакансии</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, activeFiltersCount > 0 && styles.iconButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialIcons name="filter-list" size={20} color={COLORS.white} />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
              <MaterialIcons name="logout" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

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
                placeholder="Поиск по названию..."
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
                { key: 'открыта', label: 'Открыта' },
                { key: 'пауза', label: 'Остановлена' },
                { key: 'закрыта', label: 'Закрыта' }
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
          </View>
        )}
      </LinearGradient>

      <FlatList
        data={filteredVacancies}
        renderItem={renderVacancy}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadVacancies(); }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Нет вакансий</Text>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
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
  iconButtonActive: {
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
  list: {
    padding: 14,
    paddingTop: 10,
    paddingBottom: 20,
  },
  vacancyCard: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  vacancyContent: {
    padding: 14,
  },
  vacancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vacancyInfo: {
    flex: 1,
  },
  vacancyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  vacancyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  candidatesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  candidatesCountText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
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