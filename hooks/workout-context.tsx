import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { ExerciseSession, WorkoutSession, Machine } from '@/types/workout';
import { useAuth } from '@/hooks/auth-context';

import { mockMachines } from '@/mocks/nfc-data';

interface WorkoutState {
  currentWorkout: WorkoutSession | null;
  workoutHistory: WorkoutSession[];
  exerciseHistory: Record<string, ExerciseSession[]>;
  isLoading: boolean;
  startWorkout: () => Promise<void>;
  endWorkout: () => Promise<void>;
  addExerciseSession: (session: ExerciseSession) => Promise<void>;
  getLastSessionForMachine: (machineId: string) => ExerciseSession | null;
  getMachineInfo: (machineId: string) => Machine | null;
  addManualExercise: (session: ExerciseSession, exerciseName: string) => Promise<void>;
}

export const [WorkoutProvider, useWorkout] = createContextHook<WorkoutState>(() => {
  const { user } = useAuth();
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutSession | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, ExerciseSession[]>>({});
  const [manualExerciseNames, setManualExerciseNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkoutData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('Loading workout data for user:', user.userId);
      
      // Load workout history
      const workoutsQuery = query(
        collection(db, 'workouts'),
        where('userId', '==', user.userId),
        orderBy('startedAt', 'desc')
      );
      
      console.log('Fetching workouts...');
      const workoutsSnapshot = await getDocs(workoutsQuery);
      const workouts = workoutsSnapshot.docs.map(doc => ({
        ...doc.data(),
        workoutId: doc.id
      })) as WorkoutSession[];
      
      console.log('Loaded workouts:', workouts.length);
      
      // Load exercise sessions
      const exercisesQuery = query(
        collection(db, 'exerciseSessions'),
        where('userId', '==', user.userId)
      );
      
      console.log('Fetching exercise sessions...');
      const exercisesSnapshot = await getDocs(exercisesQuery);
      const exercises = exercisesSnapshot.docs.map(doc => ({
        ...doc.data(),
        sessionId: doc.id
      })) as ExerciseSession[];
      
      console.log('Loaded exercise sessions:', exercises.length);
      
      // Sort exercises by startedAt in descending order
      exercises.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      
      // Group exercises by machine
      const exercisesByMachine: Record<string, ExerciseSession[]> = {};
      exercises.forEach(exercise => {
        if (!exercisesByMachine[exercise.machineId]) {
          exercisesByMachine[exercise.machineId] = [];
        }
        exercisesByMachine[exercise.machineId].push(exercise);
      });
      
      setExerciseHistory(exercisesByMachine);
      
      // Build manual exercise names mapping from exercise sessions
      const manualNames: Record<string, string> = {};
      exercises.forEach(exercise => {
        if (exercise.machineId.startsWith('manual-')) {
          // Try to extract the exercise name from the machine ID
          const exerciseName = exercise.machineId
            .replace('manual-', '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          manualNames[exercise.machineId] = exerciseName;
        }
      });
      setManualExerciseNames(manualNames);
      console.log('Manual exercise names loaded:', Object.keys(manualNames).length);
      
      // Associate exercise sessions with their workouts
      const workoutsWithExercises = workouts.map(workout => {
        const workoutExercises = exercises.filter(e => e.workoutId === workout.workoutId);
        return {
          ...workout,
          exerciseSessions: workoutExercises
        };
      });
      
      console.log('Workouts with exercises:', workoutsWithExercises.map(w => ({ id: w.workoutId, exercises: w.exerciseSessions.length })));
      setWorkoutHistory(workoutsWithExercises);
      
      // Check for current workout (workout without endedAt)
      const currentWorkoutData = workoutsWithExercises.find(w => !w.endedAt);
      if (currentWorkoutData) {
        setCurrentWorkout(currentWorkoutData);
        console.log('Found current workout:', currentWorkoutData.workoutId, 'with', currentWorkoutData.exerciseSessions.length, 'exercises');
      }
      
    } catch (error: any) {
      console.error('ERROR Failed to load workout data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWorkoutData();
    } else {
      // Clear data when user logs out
      setWorkoutHistory([]);
      setExerciseHistory({});
      setCurrentWorkout(null);
      setIsLoading(false);
    }
  }, [user, loadWorkoutData]);



  const startWorkout = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      console.log('Starting workout for user:', user.userId);
      const newWorkout = {
        userId: user.userId,
        startedAt: new Date().toISOString(),
        exerciseSessions: [],
      };
      
      console.log('Creating workout document:', newWorkout);
      const docRef = await addDoc(collection(db, 'workouts'), newWorkout);
      console.log('Workout created with ID:', docRef.id);
      
      const workoutWithId: WorkoutSession = {
        ...newWorkout,
        workoutId: docRef.id,
      };
      
      setCurrentWorkout(workoutWithId);
    } catch (error: any) {
      console.error('ERROR Failed to start workout:', error);
      throw new Error('Failed to start workout');
    }
  }, [user]);

  const endWorkout = useCallback(async () => {
    if (!currentWorkout || !user) return;
    
    try {
      const endedAt = new Date().toISOString();
      const totalVolume = currentWorkout.exerciseSessions.reduce((total, session) => 
        total + session.sets.reduce((setTotal, set) => 
          setTotal + (set.weightKg * set.reps), 0), 0);
      const totalSets = currentWorkout.exerciseSessions.reduce((total, session) => 
        total + session.sets.length, 0);
      
      // Update workout document in Firestore
      await updateDoc(doc(db, 'workouts', currentWorkout.workoutId), {
        endedAt,
        totalVolume,
        totalSets,
      });
      
      const completedWorkout: WorkoutSession = {
        ...currentWorkout,
        endedAt,
        totalVolume,
        totalSets,
      };
      
      setWorkoutHistory(prev => [completedWorkout, ...prev.filter(w => w.workoutId !== currentWorkout.workoutId)]);
      setCurrentWorkout(null);
    } catch (error: any) {
      console.error('ERROR Failed to end workout:', error);
      throw new Error('Failed to end workout');
    }
  }, [currentWorkout, user]);

  const getLastSessionForMachine = useCallback((machineId: string): ExerciseSession | null => {
    const sessions = exerciseHistory[machineId];
    if (!sessions || sessions.length === 0) return null;
    
    return sessions[sessions.length - 1];
  }, [exerciseHistory]);

  const getMachineInfo = useCallback((machineId: string): Machine | null => {
    // Check if it's a regular machine first
    const machine = mockMachines.find(m => m.machineId === machineId);
    if (machine) {
      return {
        machineId: machine.machineId,
        machineType: machine.machineType,
        machineName: machine.machineName,
      };
    }
    
    // Check if it's a manual exercise
    if (machineId.startsWith('manual-')) {
      // First check if we have a stored name for this machine ID
      if (manualExerciseNames[machineId]) {
        return {
          machineId,
          machineType: 'manual',
          machineName: manualExerciseNames[machineId],
        };
      }
      
      // Fallback: extract name from machine ID
      const exerciseName = machineId
        .replace('manual-', '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return {
        machineId,
        machineType: 'manual',
        machineName: exerciseName,
      };
    }
    
    return null;
  }, [manualExerciseNames]);

  const addExerciseSession = useCallback(async (session: ExerciseSession) => {
    if (!currentWorkout || !user) return;
    
    try {
      const sessionData = {
        ...session,
        userId: user.userId,
        workoutId: currentWorkout.workoutId,
      };
      
      const docRef = await addDoc(collection(db, 'exerciseSessions'), sessionData);
      
      const sessionWithId: ExerciseSession = {
        ...sessionData,
        sessionId: docRef.id,
      };
      
      // Add to current workout
      setCurrentWorkout(prev => prev ? {
        ...prev,
        exerciseSessions: [...prev.exerciseSessions, sessionWithId],
      } : null);
      
      // Add to exercise history
      setExerciseHistory(prev => ({
        ...prev,
        [session.machineId]: [...(prev[session.machineId] || []), sessionWithId],
      }));
      
      // Notification will be shown by the calling component
    } catch (error: any) {
      console.error('ERROR Failed to add exercise session:', error);
      throw new Error('Failed to save exercise session');
    }
  }, [currentWorkout, user]);

  const addManualExercise = useCallback(async (session: ExerciseSession, exerciseName: string) => {
    if (!currentWorkout || !user) return;
    
    try {
      // Store the exercise name mapping
      setManualExerciseNames(prev => ({
        ...prev,
        [session.machineId]: exerciseName,
      }));
      
      const sessionData = {
        ...session,
        userId: user.userId,
        workoutId: currentWorkout.workoutId,
      };
      
      const docRef = await addDoc(collection(db, 'exerciseSessions'), sessionData);
      
      const sessionWithId: ExerciseSession = {
        ...sessionData,
        sessionId: docRef.id,
      };
      
      // Add to current workout
      setCurrentWorkout(prev => prev ? {
        ...prev,
        exerciseSessions: [...prev.exerciseSessions, sessionWithId],
      } : null);
      
      // Add to exercise history
      setExerciseHistory(prev => ({
        ...prev,
        [session.machineId]: [...(prev[session.machineId] || []), sessionWithId],
      }));
      
      // Notification will be shown by the calling component
    } catch (error: any) {
      console.error('ERROR Failed to add manual exercise session:', error);
      throw new Error('Failed to save exercise session');
    }
  }, [currentWorkout, user]);

  return useMemo(() => ({
    currentWorkout,
    workoutHistory,
    exerciseHistory,
    isLoading,
    startWorkout,
    endWorkout,
    addExerciseSession,
    getLastSessionForMachine,
    getMachineInfo,
    addManualExercise,
  }), [currentWorkout, workoutHistory, exerciseHistory, isLoading, startWorkout, endWorkout, addExerciseSession, getLastSessionForMachine, getMachineInfo, addManualExercise]);
});