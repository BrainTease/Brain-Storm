import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { colors, spacing, typography } from '../theme/tokens';
import { RootStackParamList } from '../navigation';

type CourseDetailRouteProp = RouteProp<RootStackParamList, 'CourseDetail'>;

export function CourseDetailScreen() {
  const route = useRoute<CourseDetailRouteProp>();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getCourse(route.params.courseId)
      .then(setCourse)
      .finally(() => setLoading(false));
  }, [route.params.courseId]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  if (!course)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Course not found</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.instructor}>By {course.instructor}</Text>
      <Text style={styles.description}>{course.description}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: { ...typography.h1, color: colors.text.primary, marginBottom: spacing.sm },
  instructor: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.md },
  description: { ...typography.body, color: colors.text.primary },
  error: { ...typography.body, color: colors.error },
});
