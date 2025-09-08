import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, Activity, Plus, Edit3, Edit } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Button } from '@/components/Button';
import { ExerciseSessionCard } from '@/components/ExerciseSessionCard';
import { useWorkout } from '@/hooks/workout-context';
import { useAuth } from '@/hooks/auth-context';
import { useNotification } from '@/hooks/notification-context';
import { useNFC } from '@/hooks/nfc-context';
import { ExerciseSession, WorkoutSession } from '@/types/workout';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { createMockNFCPayload } from '@/mocks/nfc-payloads';

type HomeState = 'idle' | 'session-active' | 'session-review';

export default function HomeScreen() {
  const { user } = useAuth();
  const { 
    currentWorkout, 
    startWorkout, 
    endWorkout, 
    addExerciseSession,
    getLastSessionForMachine,
    getMachineInfo
  } = useWorkout();
  const { showNotification } = useNotification();
  const { 
    isNFCSupported, 
    isNFCEnabled, 
    isReading, 
    readNFCTag, 
    currentSessionId,
    lastPayload,
    processNFCPayload
  } = useNFC();
  
  const params = useLocalSearchParams<{ updatedSession?: string; hasChanges?: string }>();
  
  const [homeState, setHomeState] = useState<HomeState>('idle');
  const [activeMachineId, setActiveMachineId] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<ExerciseSession | null>(null);
  const [isDevMode] = useState(__DEV__); // Enable dev mode in development builds

  // Handle returning from edit session screen
  useFocusEffect(
    useCallback(() => {
      if (params.updatedSession && params.hasChanges === 'true') {
        try {
          const updatedSession = JSON.parse(params.updatedSession) as ExerciseSession;
          console.log('Received updated session from edit screen:', updatedSession);
          setPendingSession(updatedSession);
          setHomeState('session-review');
          
          // Clear the params to prevent re-processing
          router.setParams({ updatedSession: undefined, hasChanges: undefined });
        } catch (error) {
          console.error('Failed to parse updated session:', error);
        }
      }
    }, [params.updatedSession, params.hasChanges])
  );

  // Update home state based on NFC session status
  useEffect(() => {
    if (currentSessionId) {
      setHomeState('session-active');
      setActiveMachineId(lastPayload?.machine_id || null);
    } else if (!currentWorkout && homeState !== 'idle') {
      setHomeState('idle');
      setActiveMachineId(null);
      setPendingSession(null);
    }
  }, [currentWorkout, currentSessionId, lastPayload]);

  const handleNFCTap = async () => {
    if (!isNFCSupported) {
      Alert.alert('NFC Not Supported', 'Your device does not support NFC functionality.');
      return;
    }

    if (!isNFCEnabled) {
      Alert.alert('NFC Disabled', 'Please enable NFC in your device settings and try again.');
      return;
    }

    try {
      await readNFCTag();
    } catch (error: any) {
      console.error('NFC read error:', error);
      Alert.alert('NFC Error', error.message || 'Failed to read NFC tag. Please try again.');
    }
  };

  // Development mode: simulate NFC with mock data
  const handleDevModeNFC = async () => {
    try {
      const isFirstTap = !currentSessionId;
      const mockPayload = createMockNFCPayload(
        'Development Machine',
        'dev-machine-001',
        !isFirstTap // Has workout data on tap out
      );
      
      // If we have an active session, update the session IDs to match
      if (currentSessionId) {
        mockPayload.session_id_tap_out = currentSessionId;
      }
      
      await processNFCPayload(mockPayload);
    } catch (error: any) {
      console.error('Dev mode NFC error:', error);
      Alert.alert('Dev Mode Error', error.message || 'Failed to process mock NFC data.');
    }
  };

  const handleConfirmSession = async () => {
    if (!pendingSession) return;
    
    try {
      await addExerciseSession(pendingSession);
      
      // Show notification
      const machineInfo = getMachineInfo(pendingSession.machineId);
      const exerciseName = machineInfo?.machineName || 'Exercise';
      showNotification(`Exercise Saved - ${exerciseName} added to your workout!`);
      
      setPendingSession(null);
      setActiveMachineId(null);
      setHomeState('idle');
    } catch (error) {
      console.error('Failed to save exercise session:', error);
      Alert.alert('Error', 'Failed to save exercise session. Please try again.');
    }
  };

  const handleCancelSession = () => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this exercise session? This data will be lost.',
      [
        { text: 'Keep Session', style: 'cancel' },
        { 
          text: 'Cancel Session', 
          style: 'destructive',
          onPress: () => {
            setPendingSession(null);
            setActiveMachineId(null);
            setHomeState('idle');
          }
        },
      ]
    );
  };

  const handleEditSession = () => {
    if (!pendingSession) return;
    
    router.push({
      pathname: '/edit-session',
      params: {
        sessionData: JSON.stringify(pendingSession)
      }
    });
  };

  const handleUpdateSession = (updatedSession: ExerciseSession) => {
    setPendingSession(updatedSession);
  };

  const getWorkoutStartTimeText = (workout: WorkoutSession): string => {
    if (!workout.exerciseSessions.length) return '';
    
    // Use the workout's startedAt time instead of the first exercise
    const workoutStartTime = new Date(workout.startedAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.floor((now - workoutStartTime) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes === 1) return '1min ago';
    if (diffMinutes < 60) return `${diffMinutes}mins ago`;
    
    const hours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (hours === 1 && remainingMinutes === 0) return '1hr ago';
    if (hours === 1) return `1hr ${remainingMinutes}mins ago`;
    if (remainingMinutes === 0) return `${hours}hrs ago`;
    return `${hours}hrs ${remainingMinutes}mins ago`;
  };

  const handleFinishWorkout = () => {
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finish', 
          onPress: async () => {
            await endWorkout();
            setHomeState('idle');
            setActiveMachineId(null);
            setPendingSession(null);
            // Navigate to history tab and highlight most recent workout
            router.push({
              pathname: '/(tabs)/workouts',
              params: { highlightRecent: 'true' }
            });
          }
        },
      ]
    );
  };

  const renderIdleState = () => (
    <View style={styles.mainContent}>
      <View style={styles.instructionSection}>
        <View style={styles.iconContainer}>
          <Smartphone size={64} color={Colors.primary} />
        </View>
        <Text style={styles.instructionTitle}>
          Tap your phone to a machine to start an exercise
        </Text>
        
        {!isNFCSupported && (
          <View style={styles.nfcWarning}>
            <Text style={styles.nfcWarningText}>
              NFC is not supported on this device
            </Text>
          </View>
        )}
        
        {isNFCSupported && !isNFCEnabled && (
          <View style={styles.nfcWarning}>
            <Text style={styles.nfcWarningText}>
              NFC is disabled. Please enable it in device settings.
            </Text>
          </View>
        )}
        
        <Button
          title={isReading ? "Reading NFC..." : (isDevMode && !isNFCSupported ? "Simulate NFC Tap" : "Tap NFC Device")}
          onPress={isDevMode && !isNFCSupported ? handleDevModeNFC : handleNFCTap}
          variant="primary"
          size="large"
          disabled={isReading}
        />
        
        {isDevMode && isNFCSupported && (
          <Button
            title="Simulate NFC (Dev Mode)"
            onPress={handleDevModeNFC}
            variant="secondary"
            size="large"
            style={{ marginTop: 12 }}
            disabled={isReading}
          />
        )}
      </View>
      
      <View style={styles.manualExerciseSection}>
        <TouchableOpacity 
          style={styles.manualExerciseCard}
          onPress={() => router.push('/manual-entry')}
        >
          <View style={styles.manualExerciseIcon}>
            <Edit3 size={20} color={Colors.surface} />
          </View>
          <View style={styles.manualExerciseContent}>
            <Text style={styles.manualExerciseTitle}>Add Manual Exercise</Text>
            <Text style={styles.manualExerciseSubtitle}>
              Record exercises without automatic tracking
            </Text>
          </View>
          <Plus size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActiveSession = () => {
    const lastSession = activeMachineId ? getLastSessionForMachine(activeMachineId) : null;
    const machineInfo = activeMachineId ? getMachineInfo(activeMachineId) : null;
    
    return (
      <View style={styles.activeSessionContainer}>
        <View style={styles.activeHeader}>
          <Activity size={32} color={Colors.success} />
          <Text style={styles.activeTitle}>Exercise Session Active</Text>
        </View>
        
        <View style={styles.machineCard}>
          <Text style={styles.machineCardTitle}>
            {machineInfo?.machineName || 'Unknown Machine'}
          </Text>
          <Text style={styles.machineCardId}>ID: {activeMachineId}</Text>
        </View>

        {lastSession ? (
          <View style={styles.lastSessionContainer}>
            <Text style={styles.sectionTitle}>Previous Session</Text>
            <ExerciseSessionCard session={lastSession} />
          </View>
        ) : (
          <View style={styles.firstTimeContainer}>
            <Text style={styles.firstTimeText}>
              This is your first workout on this machine!
            </Text>
          </View>
        )}

        <View style={styles.activeFooter}>
          <Text style={styles.activeFooterText}>
            Complete your sets, then tap your phone to the machine again to finish
          </Text>
          <Button
            title={isReading ? "Reading NFC..." : (isDevMode && !isNFCSupported ? "Simulate Tap Out" : "Tap to Finish")}
            onPress={isDevMode && !isNFCSupported ? handleDevModeNFC : handleNFCTap}
            variant="secondary"
            size="large"
            style={styles.tapOutButton}
            disabled={isReading}
          />
        </View>
      </View>
    );
  };

  const renderSessionReview = () => {
    if (!pendingSession) return null;
    
    const machineInfo = getMachineInfo(pendingSession.machineId);
    
    return (
      <View style={styles.reviewContainer}>
        <Text style={styles.reviewTitle}>Review Exercise Session</Text>
        <Text style={styles.reviewMachine}>
          {machineInfo?.machineName || 'Unknown Machine'}
        </Text>
        
        <View style={styles.reviewCard}>
          <ExerciseSessionCard session={pendingSession} />
        </View>

        <View style={styles.reviewActions}>
          <Button
            title="Confirm & Save"
            onPress={handleConfirmSession}
            variant="primary"
            size="large"
            style={styles.confirmButton}
          />
          <Button
            title="Edit"
            onPress={handleEditSession}
            variant="secondary"
            size="large"
          />
          <Button
            title="Cancel"
            onPress={handleCancelSession}
            variant="outline"
            size="large"
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {homeState === 'idle' && renderIdleState()}
        {homeState === 'session-active' && renderActiveSession()}
        {homeState === 'session-review' && renderSessionReview()}

        {currentWorkout && currentWorkout.exerciseSessions.length > 0 && (
          <View style={styles.completedSessions}>
            <View style={styles.currentWorkoutHeader}>
              <Text style={styles.sectionTitle}>Current Workout</Text>
              {currentWorkout.exerciseSessions.length > 0 && (
                <Text style={styles.workoutStartTime}>
                  Started {getWorkoutStartTimeText(currentWorkout)}
                </Text>
              )}
            </View>
            {currentWorkout.exerciseSessions.map((session) => (
              <ExerciseSessionCard 
                key={session.sessionId} 
                session={session} 
                compact 
                isCurrentWorkout={true}
                onEdit={() => {
                  router.push({
                    pathname: '/edit-session',
                    params: {
                      sessionData: JSON.stringify(session)
                    }
                  });
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {currentWorkout && homeState === 'idle' && (
        <View style={styles.bottomBar}>
          <Button
            title="Finish Workout"
            onPress={handleFinishWorkout}
            variant="primary"
            size="large"
            style={styles.finishButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  mainContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  instructionSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 32,
  },
  instructionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  simulatorContainer: {
    width: '100%',
    padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  simulatorLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  machineSelector: {
    marginBottom: 20,
  },
  machineOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  machineOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  machineOptionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  machineOptionTextSelected: {
    color: Colors.surface,
    fontWeight: '600',
  },
  completedSessions: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  currentWorkoutHeader: {
    marginBottom: 16,
  },
  workoutStartTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  activeSessionContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.success,
  },
  machineCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  machineCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  machineCardId: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  lastSessionContainer: {
    marginBottom: 20,
  },
  firstTimeContainer: {
    backgroundColor: Colors.primaryLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  firstTimeText: {
    color: Colors.surface,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  activeFooter: {
    alignItems: 'center',
  },
  activeFooterText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  tapOutButton: {
    minWidth: 200,
  },
  reviewContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  reviewMachine: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  reviewCard: {
    marginBottom: 24,
  },
  reviewActions: {
    gap: 12,
  },
  confirmButton: {
    marginBottom: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  finishButton: {
    width: '100%',
  },
  manualExerciseSection: {
    marginTop: 0,
  },
  manualExerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  manualExerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualExerciseContent: {
    flex: 1,
  },
  manualExerciseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  manualExerciseSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  nfcWarning: {
    backgroundColor: Colors.warning + '20',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  nfcWarningText: {
    color: Colors.warning,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});