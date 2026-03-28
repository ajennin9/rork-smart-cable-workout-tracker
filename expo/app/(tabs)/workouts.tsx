import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Weight, Activity, ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useWorkout } from '@/hooks/workout-context';
import { WorkoutSession } from '@/types/workout';
import { ExerciseSessionCard } from '@/components/ExerciseSessionCard';
import { useLocalSearchParams } from 'expo-router';

export default function WorkoutsScreen() {
  const { workoutHistory } = useWorkout();
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [highlightedWorkout, setHighlightedWorkout] = useState<string | null>(null);
  const highlightAnimation = useState(new Animated.Value(0))[0];
  const params = useLocalSearchParams<{ highlightRecent?: string }>();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return 'In Progress';
    
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  useEffect(() => {
    if (params.highlightRecent === 'true' && workoutHistory.length > 0) {
      const mostRecentWorkout = workoutHistory[0];
      setHighlightedWorkout(mostRecentWorkout.workoutId);
      setExpandedWorkout(mostRecentWorkout.workoutId);
      
      // Start highlight animation
      Animated.sequence([
        Animated.timing(highlightAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Clear highlight after animation
        setTimeout(() => {
          setHighlightedWorkout(null);
        }, 1000);
      });
    }
  }, [params.highlightRecent, workoutHistory, highlightAnimation]);

  const toggleExpanded = (workoutId: string) => {
    setExpandedWorkout(expandedWorkout === workoutId ? null : workoutId);
  };

  const renderWorkoutCard = (workout: WorkoutSession) => {
    const isExpanded = expandedWorkout === workout.workoutId;
    const isHighlighted = highlightedWorkout === workout.workoutId;
    
    const highlightColor = highlightAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.surface, Colors.primaryLight],
    });
    
    return (
      <Animated.View
        key={workout.workoutId}
        style={[
          styles.workoutCard,
          isHighlighted && { backgroundColor: highlightColor }
        ]}
      >
        <TouchableOpacity
          onPress={() => toggleExpanded(workout.workoutId)}
          activeOpacity={0.7}
          style={styles.cardTouchable}
        >
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Calendar size={20} color={Colors.primary} />
            <Text style={styles.dateText}>{formatDate(workout.startedAt)}</Text>
          </View>
          <View style={styles.expandIcon}>
            {isExpanded ? (
              <ChevronUp size={20} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={Colors.textSecondary} />
            )}
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Weight size={16} color={Colors.textSecondary} />
            <Text style={styles.statValue}>
              {workout.totalVolume?.toFixed(0) || 0} kg
            </Text>
            <Text style={styles.statLabel}>Total Volume</Text>
          </View>
          
          <View style={styles.statItem}>
            <Activity size={16} color={Colors.textSecondary} />
            <Text style={styles.statValue}>{workout.totalSets || 0}</Text>
            <Text style={styles.statLabel}>Total Sets</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {calculateDuration(workout.startedAt, workout.endedAt)}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            <Text style={styles.expandedTitle}>Exercise Details</Text>
            {workout.exerciseSessions.map((session) => (
              <ExerciseSessionCard 
                key={session.sessionId} 
                session={session} 
              />
            ))}
            <Text style={styles.timeInfo}>
              Started: {formatTime(workout.startedAt)}
              {workout.endedAt && ` • Ended: ${formatTime(workout.endedAt)}`}
            </Text>
          </View>
        )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {workoutHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Activity size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Workouts Yet</Text>
            <Text style={styles.emptyText}>
              Complete your first workout to see it here
            </Text>
          </View>
        ) : (
          workoutHistory.map(renderWorkoutCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  workoutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTouchable: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  expandIcon: {
    padding: 4,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  timeInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});