import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiService } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// Единая цветовая схема
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
  textLight: '#666',
  textLighter: '#999',
  card: '#fff',
  rating: {
    excellent: '#4CAF50',
    good: '#8BC34A',
    average: '#FFC107',
    low: '#FF9800',
    poor: '#F44336',
  }
};

export default function CandidateDetailScreen() {
  const route = useRoute();
  const { vacancyId, candidateId } = route.params;
  const [candidate, setCandidate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadCandidateDetail();
  }, [vacancyId, candidateId]);

  const loadCandidateDetail = async () => {
    try {
      const response = await apiService.getCandidateDetail(
        parseInt(vacancyId || '0'),
        parseInt(candidateId || '0')
      );
      setCandidate(response.data);
    } catch (error) {
      console.error('Error loading candidate detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDecisionColor = (result) => {
    switch (result) {
      case 'Да': return COLORS.hired;
      case 'Нет': return COLORS.rejected;
      case 'Условно': return COLORS.offer;
      default: return COLORS.textLight;
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'Высокий': return COLORS.hired;
      case 'Средний': return COLORS.offer;
      case 'Низкий': return COLORS.rejected;
      default: return COLORS.textLight;
    }
  };

  const getSkillColor = (level) => {
    if (level >= 90) return COLORS.rating.excellent;
    if (level >= 80) return COLORS.rating.good;
    if (level >= 70) return COLORS.rating.average;
    return COLORS.rating.low;
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!candidate) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <MaterialIcons name="person-off" size={60} color={COLORS.textLighter} />
        <Text style={styles.errorText}>Кандидат не найден</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={18} color={COLORS.white} />
          <Text style={styles.retryButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Компактный хедер */}
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
            <Text style={styles.headerName} numberOfLines={1}>
              {candidate.firstName} {candidate.lastName}
            </Text>
            <Text style={styles.headerPosition} numberOfLines={1}>{candidate.position}</Text>
          </View>
        </View>

        {/* Быстрые метрики */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue} numberOfLines={1}>{candidate.experience}</Text>
            <Text style={styles.quickStatLabel}>Опыт</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: getSkillColor(candidate.overallMatch) }]}>
              {candidate.overallMatch}%
            </Text>
            <Text style={styles.quickStatLabel}>Соответствие</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue} numberOfLines={1}>{candidate.workFormat}</Text>
            <Text style={styles.quickStatLabel}>Формат</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Сведения о кандидате */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Сведения о кандидате</Text>

          {candidate.link && (
            <TouchableOpacity
              onPress={() => Linking.openURL(candidate.link)}
              style={styles.linkButton}
            >
              <MaterialIcons name="link" size={16} color={COLORS.primary} />
              <Text style={styles.linkText} numberOfLines={1}>{candidate.link}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ЗП ожидания</Text>
              <Text style={styles.infoValue}>{candidate.salaryExpectation}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Предпочтения</Text>
              <Text style={styles.infoValue}>{candidate.preferences}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Мотивация</Text>
              <Text style={styles.infoValue}>{candidate.motivation}</Text>
            </View>
          </View>

          <View style={styles.companiesList}>
            <Text style={styles.companiesLabel}>Ключевые компании:</Text>
            <View style={styles.companiesRow}>
              {candidate.keyCompanies.map((company, index) => (
                <View key={index} style={styles.companyBadge}>
                  <Text style={styles.companyBadgeText}>{company}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.descriptionText}>{candidate.description}</Text>

          <View style={styles.tagsRow}>
            {candidate.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Решение */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Решение</Text>

          <View style={styles.decisionHeader}>
            <View style={[styles.decisionBadge, { backgroundColor: getDecisionColor(candidate.decision.result) }]}>
              <Text style={styles.decisionBadgeText}>{candidate.decision.result}</Text>
            </View>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(candidate.decision.confidence) + '20' }]}>
              <MaterialIcons name="shield" size={14} color={getConfidenceColor(candidate.decision.confidence)} />
              <Text style={[styles.confidenceText, { color: getConfidenceColor(candidate.decision.confidence) }]}>
                {candidate.decision.confidence} уверенность
              </Text>
            </View>
          </View>

          <View style={styles.prosBlock}>
            <Text style={styles.prosTitle}>
              <MaterialIcons name="add-circle" size={16} color={COLORS.hired} /> Аргументы «За»
            </Text>
            {candidate.decision.pros.map((pro, index) => (
              <Text key={index} style={styles.prosText}>• {pro}</Text>
            ))}
          </View>

          {candidate.decision.cons.length > 0 && (
            <View style={styles.consBlock}>
              <Text style={styles.consTitle}>
                <MaterialIcons name="remove-circle" size={16} color={COLORS.rejected} /> Аргументы «Против»
              </Text>
              {candidate.decision.cons.map((con, index) => (
                <Text key={index} style={styles.consText}>• {con}</Text>
              ))}
            </View>
          )}

          <View style={styles.checkBlock}>
            <Text style={styles.checkTitle}>Что перепроверить</Text>
            {candidate.decision.whatToCheck.map((check, index) => (
              <View key={index} style={styles.checkItem}>
                <MaterialIcons name="check-box-outline-blank" size={16} color={COLORS.primary} />
                <Text style={styles.checkText}>{check}</Text>
              </View>
            ))}
          </View>

          <View style={styles.recommendBlock}>
            <MaterialIcons name="lightbulb" size={20} color={COLORS.offer} />
            <Text style={styles.recommendText}>{candidate.decision.recommendedStep}</Text>
          </View>
        </View>

        {/* Итоговая сводка */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Итоговая сводка</Text>

          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>Сильные стороны</Text>
            {candidate.summary.strengths.map((item, index) => (
              <Text key={index} style={styles.summaryItem}>• {item}</Text>
            ))}
          </View>

          {candidate.summary.weaknesses.length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Зоны роста</Text>
              {candidate.summary.weaknesses.map((item, index) => (
                <Text key={index} style={styles.summaryItemWeak}>• {item}</Text>
              ))}
            </View>
          )}

          {candidate.summary.redFlags.length > 0 && (
            <View style={styles.redFlagsSection}>
              <Text style={styles.redFlagsTitle}>Красные флаги</Text>
              {candidate.summary.redFlags.map((item, index) => (
                <Text key={index} style={styles.redFlagItem}>• {item}</Text>
              ))}
            </View>
          )}

          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>Ключевые преимущества</Text>
            {candidate.summary.keyAdvantages.map((item, index) => (
              <Text key={index} style={styles.summaryItem}>• {item}</Text>
            ))}
          </View>
        </View>

        {/* Софтскиллы */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Карта софтскиллов</Text>

          <View style={styles.overallRow}>
            <View style={styles.overallItem}>
              <Text style={styles.overallValue}>{candidate.overallMatch}%</Text>
              <Text style={styles.overallLabel}>Соответствие</Text>
            </View>
            <View style={styles.overallItem}>
              <Text style={styles.overallValue}>{candidate.overallConfidence}%</Text>
              <Text style={styles.overallLabel}>Уверенность ИИ</Text>
            </View>
          </View>

          {candidate.softSkills.map((skill, index) => (
            <View key={index} style={styles.skillCard}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={[styles.skillPercent, { color: getSkillColor(skill.matchLevel) }]}>
                  {skill.matchLevel}%
                </Text>
              </View>

              <View style={styles.skillBar}>
                <View style={[styles.skillBarFill, { width: `${skill.matchLevel}%`, backgroundColor: getSkillColor(skill.matchLevel) }]} />
              </View>

              <View style={styles.skillMeta}>
                <Text style={styles.skillMetaText}>Вес: {skill.weight}%</Text>
                <Text style={styles.skillMetaText}>Уровень: {skill.level}</Text>
                <Text style={styles.skillMetaText}>Уверенность: {skill.confidence}%</Text>
              </View>

              <View style={styles.indicatorsBlock}>
                <Text style={styles.indicatorsTitle}>Индикаторы</Text>
                {skill.indicators.map((indicator, idx) => (
                  <Text key={idx} style={styles.indicatorText}>• {indicator}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* STAR кейсы */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Кейсы (STAR)</Text>

          {candidate.starCases.map((starCase, index) => (
            <View key={index} style={styles.starCard}>
              <View style={styles.starHeader}>
                <View style={styles.starNumber}>
                  <Text style={styles.starNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.starTitle}>Кейс {index + 1}</Text>
              </View>

              <View style={styles.starItem}>
                <Text style={styles.starLabel}>Situation</Text>
                <Text style={styles.starText}>{starCase.situation}</Text>
              </View>
              <View style={styles.starItem}>
                <Text style={styles.starLabel}>Task</Text>
                <Text style={styles.starText}>{starCase.task}</Text>
              </View>
              <View style={styles.starItem}>
                <Text style={styles.starLabel}>Action</Text>
                <Text style={styles.starText}>{starCase.action}</Text>
              </View>
              <View style={styles.starItem}>
                <Text style={styles.starLabel}>Result</Text>
                <Text style={styles.starText}>{starCase.result}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
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
    gap: 15,
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
    marginBottom: 12,
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
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  headerPosition: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 10,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  quickStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  quickStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingTop: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  infoGrid: {
    gap: 10,
    marginBottom: 14,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
    width: 100,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  companiesList: {
    marginBottom: 14,
  },
  companiesLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 8,
  },
  companiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  companyBadge: {
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  companyBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  decisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  decisionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  decisionBadgeText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  prosBlock: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  prosTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.hired,
    marginBottom: 8,
  },
  prosText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  consBlock: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  consTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.rejected,
    marginBottom: 8,
  },
  consText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  checkBlock: {
    marginBottom: 14,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  recommendBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
  },
  recommendText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: 18,
  },
  summarySection: {
    marginBottom: 14,
  },
  summarySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  summaryItem: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 3,
  },
  summaryItemWeak: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 3,
  },
  redFlagsSection: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  redFlagsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.rejected,
    marginBottom: 6,
  },
  redFlagItem: {
    fontSize: 13,
    color: COLORS.rejected,
    lineHeight: 20,
    marginBottom: 3,
  },
  overallRow: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  overallItem: {
    flex: 1,
    alignItems: 'center',
  },
  overallValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  overallLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  skillCard: {
    backgroundColor: `${COLORS.primary}05`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  skillPercent: {
    fontSize: 18,
    fontWeight: '700',
  },
  skillBar: {
    height: 6,
    backgroundColor: '#e8e8e8',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  skillMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  skillMetaText: {
    fontSize: 11,
    color: COLORS.textLighter,
  },
  indicatorsBlock: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  indicatorsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  indicatorText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 3,
  },
  starCard: {
    backgroundColor: `${COLORS.primary}05`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  starHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  starNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starNumberText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  starTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  starItem: {
    marginBottom: 10,
  },
  starLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  starText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textLighter,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});