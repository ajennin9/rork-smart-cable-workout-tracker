import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import { NFCPayload } from '@/types/workout';
import { nfcService } from '@/services/nfc';
import { useAuth } from '@/hooks/auth-context';
import { useWorkout } from '@/hooks/workout-context';
import { useNotification } from '@/hooks/notification-context';

interface NFCState {
  isNFCSupported: boolean;
  isNFCEnabled: boolean;
  isReading: boolean;
  lastPayload: NFCPayload | null;
  currentSessionId: string | null;
  sessionTimeout: number | null;
  readNFCTag: () => Promise<NFCPayload | null>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  processNFCPayload: (payload: NFCPayload) => Promise<void>;
  clearCurrentSession: () => void;
}

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const [NFCProvider, useNFC] = createContextHook<NFCState>(() => {
  const { user } = useAuth();
  const { currentWorkout, startWorkout, addExerciseSession, endWorkout } = useWorkout();
  const { showNotification } = useNotification();
  
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isNFCEnabled, setIsNFCEnabled] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [lastPayload, setLastPayload] = useState<NFCPayload | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);

  // Initialize NFC on mount
  useEffect(() => {
    initializeNFC();
  }, []);

  // Session timeout logic
  useEffect(() => {
    if (currentSessionId && !sessionTimeout) {
      const timeout = setTimeout(() => {
        console.log('Session timed out:', currentSessionId);
        showNotification('Session timed out');
        clearCurrentSession();
      }, SESSION_TIMEOUT_MS);
      
      setSessionTimeout(timeout);
    }

    return () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [currentSessionId, sessionTimeout, showNotification]);

  const initializeNFC = useCallback(async () => {
    try {
      const supported = await nfcService.initialize();
      setIsNFCSupported(supported);
      
      if (supported) {
        const enabled = await nfcService.isEnabled();
        setIsNFCEnabled(enabled);
      }
    } catch (error) {
      console.error('Failed to initialize NFC:', error);
      setIsNFCSupported(false);
    }
  }, []);

  const readNFCTag = useCallback(async (): Promise<NFCPayload | null> => {
    if (!isNFCSupported) {
      throw new Error('NFC not supported on this device');
    }

    if (!isNFCEnabled) {
      throw new Error('NFC is disabled. Please enable NFC in device settings.');
    }

    try {
      setIsReading(true);
      const payload = await nfcService.readNFCTag();
      
      if (payload) {
        setLastPayload(payload);
        await processNFCPayload(payload);
      }
      
      return payload;
    } catch (error) {
      console.error('Failed to read NFC tag:', error);
      throw error;
    } finally {
      setIsReading(false);
    }
  }, [isNFCSupported, isNFCEnabled]);

  const startListening = useCallback(async () => {
    if (!isNFCSupported || !isNFCEnabled) {
      throw new Error('NFC not available');
    }

    try {
      await nfcService.startTagListener(async (payload) => {
        setLastPayload(payload);
        await processNFCPayload(payload);
      });
    } catch (error) {
      console.error('Failed to start NFC listening:', error);
      throw error;
    }
  }, [isNFCSupported, isNFCEnabled]);

  const stopListening = useCallback(async () => {
    try {
      await nfcService.stopTagListener();
    } catch (error) {
      console.error('Failed to stop NFC listening:', error);
      throw error;
    }
  }, []);

  const processNFCPayload = useCallback(async (payload: NFCPayload) => {
    if (!user) {
      console.error('No user authenticated');
      return;
    }

    console.log('Processing NFC payload:', payload);

    // Check if this is the same payload as last time (duplicate tap)
    if (lastPayload && 
        lastPayload.session_id_tap_in === payload.session_id_tap_in &&
        lastPayload.session_id_tap_out === payload.session_id_tap_out) {
      console.log('Duplicate NFC tap detected');
      showNotification(
        `Session already active on ${payload.machine_name || payload.machine_id}. Start working out!`
      );
      return;
    }

    // Check if this is a tap out (session_id_tap_out matches current session)
    if (currentSessionId && payload.session_id_tap_out === currentSessionId) {
      console.log('Tap out detected - saving workout data');
      await handleTapOut(payload);
      return;
    }

    // This is a tap in (new session)
    console.log('Tap in detected - starting new session');
    await handleTapIn(payload);

  }, [user, lastPayload, currentSessionId, showNotification]);

  const handleTapIn = useCallback(async (payload: NFCPayload) => {
    try {
      // Clear any existing session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }

      // If there was a previous session, abandon it
      if (currentSessionId) {
        console.log('Abandoning previous session:', currentSessionId);
        showNotification('Previous session abandoned');
      }

      // Start workout if not already started
      if (!currentWorkout) {
        console.log('Starting new workout');
        await startWorkout();
      }

      // Set new current session
      setCurrentSessionId(payload.session_id_tap_in);
      
      showNotification(
        `Started session on ${payload.machine_name || payload.machine_id}`
      );

    } catch (error) {
      console.error('Failed to handle tap in:', error);
      showNotification('Failed to start session');
    }
  }, [currentWorkout, startWorkout, currentSessionId, sessionTimeout, showNotification]);

  const handleTapOut = useCallback(async (payload: NFCPayload) => {
    if (!currentWorkout || !user) {
      console.error('No active workout or user');
      return;
    }

    try {
      // Clear session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }

      // Process session data if available
      if (payload.session_data && payload.session_data.sets.length > 0) {
        const session = {
          sessionId: `session-${Date.now()}`,
          userId: user.userId,
          workoutId: currentWorkout.workoutId,
          machineId: payload.machine_id,
          machineType: payload.machine_type,
          startedAt: new Date(payload.session_data.start_time * 1000).toISOString(),
          endedAt: new Date(payload.session_data.end_time * 1000).toISOString(),
          sets: payload.session_data.sets.map(set => ({
            weightLbs: set.weight_lbs,
            reps: set.reps,
            durationMs: set.duration_ms,
          })),
        };

        console.log('Saving exercise session:', session);
        await addExerciseSession(session);
        
        showNotification(
          `Saved workout: ${payload.session_data.sets.length} sets on ${payload.machine_name || payload.machine_id}`
        );
      } else {
        console.log('No session data to save');
        showNotification('No workout data recorded');
      }

      // Clear current session
      setCurrentSessionId(null);

    } catch (error) {
      console.error('Failed to handle tap out:', error);
      showNotification('Failed to save workout data');
    }
  }, [currentWorkout, user, addExerciseSession, sessionTimeout, showNotification]);

  const clearCurrentSession = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
    setCurrentSessionId(null);
  }, [sessionTimeout]);

  return {
    isNFCSupported,
    isNFCEnabled,
    isReading,
    lastPayload,
    currentSessionId,
    sessionTimeout,
    readNFCTag,
    startListening,
    stopListening,
    processNFCPayload,
    clearCurrentSession,
  };
});
