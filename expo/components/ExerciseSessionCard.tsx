import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, Edit } from 'lucide-react-native';
import { ExerciseSession } from '@/types/workout';
import Colors from '@/constants/colors';
import { useWorkout } from '@/hooks/workout-context';

interface ExerciseSessionCardProps {
  session: ExerciseSession;
  compact?: boolean;
  isCurrentWorkout?: boolean;
  onEdit?: () => void;
}

export function ExerciseSessionCard({ session, compact = false, isCurrentWorkout = false, onEdit }: ExerciseSessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { getMachineInfo } = useWorkout();
  const machineInfo = getMachineInfo(session.machineId);
  
  const totalVolume = session.sets.reduce((total, set) => 
    total + (set.weightLbs * set.reps), 0);
  
  const totalReps = session.sets.reduce((total, set) => 
    total + set.reps, 0);

  if (compact) {
    return (
      <View style={[
        styles.compactCard,
        isCurrentWorkout && styles.compactCardCurrentWorkout
      ]}>
        <TouchableOpacity 
          style={styles.compactHeader}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.compactHeaderContent}>
            <Text style={styles.compactTitle}>{machineInfo?.machineName || 'Unknown Machine'}</Text>
            <Text style={styles.compactStats}>
              {session.sets.length} sets • {totalReps} reps • {totalVolume.toFixed(0)}kg volume
            </Text>
          </View>
          <View style={styles.compactActions}>
            {onEdit && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                activeOpacity={0.7}
              >
                <Edit size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {isExpanded ? (
              <ChevronUp size={20} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={Colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.setsContainer}>
              {session.sets.map((set, index) => (
                <View key={index} style={styles.setRow}>
                  <Text style={styles.setNumber}>Set {index + 1}</Text>
                  <Text style={styles.setDetails}>
                    {set.weightLbs}lbs × {set.reps} reps
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.machineName}>{machineInfo?.machineName || 'Unknown Machine'}</Text>
      <View style={styles.setsContainer}>
        {session.sets.map((set, index) => (
          <View key={index} style={styles.setRow}>
            <Text style={styles.setNumber}>Set {index + 1}</Text>
            <Text style={styles.setDetails}>
              {set.weightLbs}lbs × {set.reps} reps
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.statText}>Total: {totalVolume.toFixed(0)}kg volume</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  compactHeaderContent: {
    flex: 1,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  compactCardCurrentWorkout: {
    backgroundColor: '#f0f9f0',
    borderColor: '#d4edda',
  },
  machineName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  compactStats: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  setsContainer: {
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  setNumber: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  setDetails: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  statsRow: {
    paddingTop: 8,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});