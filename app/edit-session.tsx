import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Button } from '@/components/Button';
import { useWorkout } from '@/hooks/workout-context';
import { ExerciseSession } from '@/types/workout';

interface EditableSet {
  weightKg: number;
  reps: number;
  durationMs: number;
}

export default function EditSessionScreen() {
  const { sessionData } = useLocalSearchParams<{ sessionData: string }>();
  const { getMachineInfo } = useWorkout();
  
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [editableSets, setEditableSets] = useState<EditableSet[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (sessionData) {
      try {
        const parsedSession = JSON.parse(sessionData) as ExerciseSession;
        setSession(parsedSession);
        setEditableSets([...parsedSession.sets]);
      } catch (error) {
        console.error('Failed to parse session data:', error);
        router.back();
      }
    }
  }, [sessionData]);

  const machineInfo = session ? getMachineInfo(session.machineId) : null;
  const duration = session ? 
    Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000) : 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  const updateSet = (index: number, field: keyof EditableSet, value: string) => {
    const inputKey = `${field}-${index}`;
    setInputValues(prev => ({ ...prev, [inputKey]: value }));
    
    const numValue = field === 'durationMs' ? parseInt(value) || 0 : parseFloat(value) || 0;
    
    setEditableSets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: numValue };
      return updated;
    });
    setHasChanges(true);
  };

  const addSet = () => {
    const lastSet = editableSets[editableSets.length - 1];
    const newSet: EditableSet = {
      weightKg: lastSet?.weightKg || 50,
      reps: lastSet?.reps || 10,
      durationMs: lastSet?.durationMs || 30000,
    };
    
    setEditableSets(prev => [...prev, newSet]);
    setHasChanges(true);
  };

  const removeSet = (index: number) => {
    if (editableSets.length <= 1) {
      Alert.alert('Cannot Remove', 'An exercise session must have at least one set.');
      return;
    }
    
    setEditableSets(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    if (!session) return;
    
    const updatedSession: ExerciseSession = {
      ...session,
      sets: editableSets
    };
    
    // Navigate back with the updated session data
    router.replace({
      pathname: '/(tabs)',
      params: {
        updatedSession: JSON.stringify(updatedSession),
        hasChanges: 'true'
      }
    });
  };

  const handleCancelEditing = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Edit Session',
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancelEditing} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTitleStyle: {
            color: Colors.text,
            fontSize: 18,
            fontWeight: '600',
          },
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Exercise Info */}
        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseIcon}>
              <Text style={styles.exerciseNumber}>1</Text>
            </View>
            <View style={styles.exerciseDetails}>
              <Text style={styles.exerciseName}>
                {machineInfo?.machineName || 'Unknown Exercise'}
              </Text>
              <Text style={styles.machineType}>
                {machineInfo?.machineType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Machine'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.duration}>
            Duration: {minutes}m {seconds}s
          </Text>
        </View>

        {/* Edit Sets Section */}
        <View style={styles.setsSection}>
          <View style={styles.setsHeader}>
            <Text style={styles.setsTitle}>Edit Sets</Text>
            <TouchableOpacity onPress={addSet} style={styles.addSetButton}>
              <Plus size={16} color={Colors.surface} />
              <Text style={styles.addSetText}>Add Set</Text>
            </TouchableOpacity>
          </View>

          {editableSets.map((set, index) => (
            <View key={index} style={styles.setCard}>
              <View style={styles.setHeader}>
                <View style={styles.setNumber}>
                  <Text style={styles.setNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.setTitle}>Set {index + 1}</Text>
                <TouchableOpacity 
                  onPress={() => removeSet(index)}
                  style={styles.removeButton}
                >
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.setInputs}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={inputValues[`weightKg-${index}`] !== undefined ? inputValues[`weightKg-${index}`] : set.weightKg.toString()}
                    onChangeText={(value) => updateSet(index, 'weightKg', value)}
                    onFocus={() => {
                      setInputValues(prev => ({ ...prev, [`weightKg-${index}`]: '' }));
                    }}
                    keyboardType="numeric"
                    placeholder="50"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reps</Text>
                  <TextInput
                    style={styles.input}
                    value={inputValues[`reps-${index}`] !== undefined ? inputValues[`reps-${index}`] : set.reps.toString()}
                    onChangeText={(value) => updateSet(index, 'reps', value)}
                    onFocus={() => {
                      setInputValues(prev => ({ ...prev, [`reps-${index}`]: '' }));
                    }}
                    keyboardType="numeric"
                    placeholder="10"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Updated Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Updated Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{editableSets.length}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {editableSets.reduce((total, set) => total + (set.weightKg * set.reps), 0).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Total Volume (kg)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {editableSets.reduce((total, set) => total + set.reps, 0)}
              </Text>
              <Text style={styles.statLabel}>Total Reps</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title="Save Changes"
          onPress={handleSaveChanges}
          variant="primary"
          size="large"
          style={styles.saveButton}
          disabled={!hasChanges}
        />
        <Button
          title="Cancel Editing"
          onPress={handleCancelEditing}
          variant="outline"
          size="large"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  exerciseInfo: {
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseNumber: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  machineType: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  duration: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  setsSection: {
    paddingHorizontal: 16,
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  setsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addSetText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  setCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setNumberText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  setTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  removeButton: {
    padding: 4,
  },
  setInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
  },
  summarySection: {
    backgroundColor: Colors.primaryLight,
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
  },
  bottomActions: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
});