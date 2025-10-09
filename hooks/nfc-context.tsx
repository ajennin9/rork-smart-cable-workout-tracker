import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { NFCPayload } from '@/types/workout';
import { useAuth } from '@/hooks/auth-context';
import { useWorkout } from '@/hooks/workout-context';
import { useNotification } from '@/hooks/notification-context';

// Conditional import for NFC service (only on native platforms)
let nfcService: any = null;
if (Platform.OS !== 'web') {
  try {
    nfcService = require('@/services/nfc').nfcService;
  } catch (error) {
    console.warn('NFC service not available:', error);
  }
}

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
const SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

interface MatchedSessionData {
  slot: 'b' | 'c' | 'd';
  sessionId: string;
  data: {
    session_duration_ms: number;
    sets: Array<{
      weight_lbs: number;
      reps: number;
      duration_ms: number;
    }>;
  };
}

// Helper function to find which session matches the current user session
const findMatchingSession = (payload: NFCPayload, currentSessionId: string | null, sessionStartTime: number | null): MatchedSessionData | null => {
  if (!currentSessionId || !sessionStartTime) return null;
  
  // Check if session is within recovery window (1 hour from tap-in time)
  const sessionAge = Date.now() - sessionStartTime;
  if (sessionAge > SESSION_MAX_AGE_MS) {
    return null; // Session too old for recovery
  }
  
  // Check session_id_b
  if (payload.session_id_b === currentSessionId && payload.session_data_b) {
    if (payload.session_data_b.sets.length > 0) {
      return {
        slot: 'b',
        sessionId: payload.session_id_b,
        data: payload.session_data_b
      };
    }
  }
  
  // Check session_id_c
  if (payload.session_id_c === currentSessionId && payload.session_data_c) {
    if (payload.session_data_c.sets.length > 0) {
      return {
        slot: 'c',
        sessionId: payload.session_id_c,
        data: payload.session_data_c
      };
    }
  }
  
  // Check session_id_d
  if (payload.session_id_d === currentSessionId && payload.session_data_d) {
    if (payload.session_data_d.sets.length > 0) {
      return {
        slot: 'd',
        sessionId: payload.session_id_d,
        data: payload.session_data_d
      };
    }
  }
  
  return null;
};

export const [NFCProvider, useNFC] = createContextHook<NFCState>(() => {
  const { user } = useAuth();
  const { currentWorkout, startWorkout, addExerciseSession, endWorkout } = useWorkout();
  const { showNotification } = useNotification();
  
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isNFCEnabled, setIsNFCEnabled] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [lastPayload, setLastPayload] = useState<NFCPayload | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionStartTime, setCurrentSessionStartTime] = useState<number | null>(null);
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
    // Skip NFC initialization on web
    if (Platform.OS === 'web' || !nfcService) {
      console.log('NFC not available on web platform');
      setIsNFCSupported(false);
      return;
    }

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
    if (Platform.OS === 'web' || !nfcService) {
      throw new Error('NFC not available on web platform');
    }

    if (!isNFCSupported) {
      throw new Error('NFC not supported on this device');
    }

    if (!isNFCEnabled) {
      throw new Error('NFC is disabled. Please enable NFC in device settings.');
    }

    try {
      setIsReading(true);
      const payload = await nfcService.readTag();
      
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
    if (Platform.OS === 'web' || !nfcService) {
      throw new Error('NFC not available on web platform');
    }

    if (!isNFCSupported || !isNFCEnabled) {
      throw new Error('NFC not available');
    }

    try {
      await nfcService.startTagListener(async (payload: NFCPayload) => {
        setLastPayload(payload);
        await processNFCPayload(payload);
      });
    } catch (error) {
      console.error('Failed to start NFC listening:', error);
      throw error;
    }
  }, [isNFCSupported, isNFCEnabled]);

  const stopListening = useCallback(async () => {
    if (Platform.OS === 'web' || !nfcService) {
      return; // No-op on web
    }

    try {
      await nfcService.stopTagListener();
    } catch (error) {
      console.error('Failed to stop NFC listening:', error);
      throw error;
    }
  }, []);

  const processNFCPayload = useCallback(async (payload: NFCPayload) => {
    console.log('processNFCPayload called with user:', user);
    console.log('User state:', { user: user ? 'present' : 'null', userId: user?.userId });
    
    if (!user) {
      console.error('No user authenticated');
      console.error('Auth context user state:', user);
      return;
    }

    console.log('Processing NFC payload:', payload);

    // Check if this is the same payload as last time (duplicate tap)
    if (lastPayload && 
        lastPayload.session_id_a === payload.session_id_a &&
        lastPayload.session_id_b === payload.session_id_b) {
      console.log('Duplicate NFC tap detected');
      showNotification(
        `Session already active on ${payload.machine_name || payload.machine_id}. Start working out!`
      );
      return;
    }

    // Check if this is a tap out (current session matches any of the session IDs with workout data)
    const matchedSession = findMatchingSession(payload, currentSessionId, currentSessionStartTime);
    if (matchedSession) {
      console.log(`Tap out detected - found session data in ${matchedSession.slot}`);
      await handleTapOut(payload, matchedSession);
      return;
    }

    // This is a tap in (new session)
    console.log('Tap in detected - starting new session');
    await handleTapIn(payload);

  }, [user, lastPayload, currentSessionId, currentSessionStartTime, showNotification]);

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
      setCurrentSessionId(payload.session_id_a);
      setCurrentSessionStartTime(Date.now());
      
      showNotification(
        `Started session on ${payload.machine_name || payload.machine_id}`
      );

    } catch (error) {
      console.error('Failed to handle tap in:', error);
      showNotification('Failed to start session');
    }
  }, [currentWorkout, startWorkout, currentSessionId, sessionTimeout, showNotification]);

  const handleTapOut = useCallback(async (payload: NFCPayload, matchedSession?: MatchedSessionData) => {
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

      // Process session data - either matched session or no current session data for tap-ins
      if (matchedSession && matchedSession.data.sets.length > 0) {
        // Recovery mode - use the matched session data
        const sessionData = matchedSession.data;
        console.log('Recovering session from device:', matchedSession);

        // Calculate session timing using app's tap-in time and current time
        const tapOutTime = Date.now();
        const tapInTime = currentSessionStartTime || (tapOutTime - SESSION_MAX_AGE_MS); // Fallback if no start time
        
        const session = {
          sessionId: `session-${Date.now()}`,
          userId: user.userId,
          workoutId: currentWorkout.workoutId,
          machineId: payload.machine_id,
          machineType: payload.machine_type,
          startedAt: new Date(tapInTime).toISOString(),
          endedAt: new Date(tapOutTime).toISOString(),
          sets: sessionData.sets.map((set: {
            weight_lbs: number;
            reps: number;
            duration_ms: number;
          }) => ({
            weightLbs: set.weight_lbs,
            reps: set.reps,
            durationMs: set.duration_ms,
          })),
        };

        console.log('Saving exercise session:', session);
        await addExerciseSession(session);
        
        showNotification(`Recovered workout: ${sessionData.sets.length} sets on ${payload.machine_name || payload.machine_id}`);
      } else {
        // Normal tap-out from fresh session (session_id_a) - no workout data to save yet
        console.log('Tapping out from fresh session - no workout data available');
        showNotification('Session ended - no workout data recorded yet');
      }

      // Clear current session
      setCurrentSessionId(null);
      setCurrentSessionStartTime(null);

    } catch (error) {
      console.error('Failed to handle tap out:', error);
      showNotification('Failed to save workout data');
    }
  }, [currentWorkout, user, addExerciseSession, sessionTimeout, currentSessionStartTime, showNotification]);

  const clearCurrentSession = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
    setCurrentSessionId(null);
    setCurrentSessionStartTime(null);
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
