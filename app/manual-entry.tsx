import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Button } from '@/components/Button';
import { ExerciseAutocomplete } from '@/components/ExerciseAutocomplete';
import { useWorkout } from '@/hooks/workout-context';
import { useAuth } from '@/hooks/auth-context';
import { useNotification } from '@/hooks/notification-context';
import { ExerciseSession } from '@/types/workout';

interface SetData {
  weightLbs: number;
  reps: number;
}

export default function ManualEntryScreen() {
  const { user } = useAuth();
  const { currentWorkout, startWorkout, addManualExercise } = useWorkout();
  const { showNotification } = useNotification();
  
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [sets, setSets] = useState<SetData[]>([
    { weightLbs: 0, reps: 0 },
    { weightLbs: 0, reps: 0 },
    { weightLbs: 0, reps: 0 },
  ]);
  const [durationMinutes, setDurationMinutes] = useState<string>('0');
  const [durationSeconds, setDurationSeconds] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addSet = () => {
    setSets(prev => [...prev, { weightLbs: 0, reps: 0 }]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, field: keyof SetData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSets(prev => prev.map((set, i) => 
      i === index ? { ...set, [field]: numValue } : set
    ));
  };

  const handleExerciseChange = (exercise: string) => {
    console.log('Exercise changed to:', exercise);
    setSelectedExercise(exercise);
  };

  const handleSaveExercise = async () => {
    if (!selectedExercise.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Check if any set has data
    const hasValidSets = sets.some(set => set.weightLbs > 0 || set.reps > 0);
    if (!hasValidSets) {
      Alert.alert('Error', 'Please add at least one set with weight or reps');
      return;
    }

    try {
      setIsLoading(true);
      
      // Start workout if not already started
      let workout = currentWorkout;
      if (!workout) {
        await startWorkout();
        // Note: In a real app, we'd wait for the workout to be created
        // For now, we'll create a temporary workout ID
        workout = {
          workoutId: `temp-${Date.now()}`,
          userId: user.userId,
          startedAt: new Date().toISOString(),
          exerciseSessions: [],
        };
      }

      const now = new Date();
      const totalDurationMs = (parseInt(durationMinutes) * 60 + parseInt(durationSeconds)) * 1000;
      const startTime = new Date(now.getTime() - totalDurationMs);

      const session: ExerciseSession = {
        sessionId: `manual-${Date.now()}`,
        userId: user.userId,
        workoutId: workout.workoutId,
        machineId: `manual-${selectedExercise.toLowerCase().replace(/\s+/g, '-')}`,
        machineType: 'manual',
        startedAt: startTime.toISOString(),
        endedAt: now.toISOString(),
        sets: sets.filter(set => set.weightLbs > 0 || set.reps > 0).map(set => ({
          weightLbs: set.weightLbs,
          reps: set.reps,
          durationMs: totalDurationMs / sets.length, // Distribute duration across sets
        })),
      };
      
      console.log('Creating manual exercise session:', {
        exerciseName: selectedExercise,
        machineId: session.machineId,
        sets: session.sets
      });

      console.log('About to save manual exercise with name:', selectedExercise);
      await addManualExercise(session, selectedExercise);
      
      console.log('Manual exercise saved successfully');
      
      // Show notification
      showNotification(`Exercise Saved - ${selectedExercise} added to your workout!`);
      
      // Navigate back to home screen immediately
      router.back();
    } catch (error) {
      console.error('ERROR Failed to save manual exercise:', error);
      Alert.alert('Error', 'Failed to save exercise. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen 
        options={{
          title: 'Manual Entry',
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Selection */}
        <View style={[styles.section, { zIndex: 1000 }]}>
          <Text style={styles.sectionTitle}>Exercise</Text>
          <ExerciseAutocomplete
            value={selectedExercise}
            onValueChange={handleExerciseChange}
            placeholder="Type exercise name..."
          />
        </View>

        {/* Sets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sets</Text>
            <TouchableOpacity style={styles.addButton} onPress={addSet}>
              <Plus size={16} color={Colors.surface} />
              <Text style={styles.addButtonText}>Add Set</Text>
            </TouchableOpacity>
          </View>

          {sets.map((set, index) => (
            <View key={index} style={styles.setContainer}>
              <View style={styles.setHeader}>
                <Text style={styles.setTitle}>Set {index + 1}</Text>
                {sets.length > 1 && (
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => removeSet(index)}
                  >
                    <Trash2 size={16} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.setInputs}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={styles.input}
                    value={set.weightLbs === 0 ? '' : set.weightLbs.toString()}
                    onChangeText={(value) => updateSet(index, 'weightLbs', value)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    selectTextOnFocus
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reps</Text>
                  <TextInput
                    style={styles.input}
                    value={set.reps === 0 ? '' : set.reps.toString()}
                    onChangeText={(value) => updateSet(index, 'reps', value)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Duration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration (Optional)</Text>
          <View style={styles.durationContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minutes</Text>
              <TextInput
                style={styles.input}
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                selectTextOnFocus
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Seconds</Text>
              <TextInput
                style={styles.input}
                value={durationSeconds}
                onChangeText={setDurationSeconds}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                selectTextOnFocus
              />
            </View>
          </View>
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this exercise..."
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title="Cancel"
          onPress={handleCancel}
          variant="outline"
          size="large"
          style={styles.cancelButton}
        />
        <Button
          title="Save Exercise"
          onPress={handleSaveExercise}
          variant="primary"
          size="large"
          style={styles.saveButton}
          loading={isLoading}
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
  backButton: {
    padding: 8,
    marginLeft: -4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  setContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteButton: {
    padding: 4,
  },
  setInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    minHeight: 100,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },

});