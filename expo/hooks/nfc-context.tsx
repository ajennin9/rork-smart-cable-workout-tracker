import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { CompactNFCPayload } from '@/types/workout';
import { useAuth } from '@/hooks/auth-context';
import { useWorkout } from '@/hooks/workout-context';
import { useNotification } from '@/hooks/notification-context';
import { auth } from '@/constants/firebase';
import { 
  convertCompactSessionToExerciseSession, 
  findMatchingCompactSession, 
  isDuplicateTap 
} from '@/utils/nfc-compact';

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
  lastPayload: CompactNFCPayload | null;
  currentSessionId: string | null;
  sessionTimeout: number | null;
  readNFCTag: () => Promise<CompactNFCPayload | null>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  processNFCPayload: (payload: CompactNFCPayload) => Promise<void>;
  clearCurrentSession: () => void;
  handleEmptyTap: () => void;
}

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

interface MatchedSessionData {
  role: 'b' | 'c' | 'd';
  sessionId: string;
  sets: Array<[number, number]>;
}

export const [NFCProvider, useNFC] = createContextHook<NFCState>(() => {
  const { user, isLoading } = useAuth();
  const { currentWorkout, startWorkout, addExerciseSession, endWorkout } = useWorkout();
  const { showNotification } = useNotification();
  
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isNFCEnabled, setIsNFCEnabled] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [lastPayload, setLastPayload] = useState<CompactNFCPayload | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionStartTime, setCurrentSessionStartTime] = useState<number | null>(null);
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);

  // Use ref to persist session data across re-renders/remounts
  const sessionStateRef = useRef<{
    sessionId: string | null;
    startTime: number | null;
    timeout: number | null;
  }>({
    sessionId: null,
    startTime: null,
    timeout: null,
  });

  // Sync ref with state
  useEffect(() => {
    sessionStateRef.current = {
      sessionId: currentSessionId,
      startTime: currentSessionStartTime,
      timeout: sessionTimeout,
    };
  }, [currentSessionId, currentSessionStartTime, sessionTimeout]);

  // Debug logging for session state changes
  useEffect(() => {
    console.log('Current session ID changed to:', currentSessionId);
    console.log('Session ref state:', sessionStateRef.current);
  }, [currentSessionId]);

  // Initialize NFC on mount
  useEffect(() => {
    initializeNFC();
  }, []);

  // Session timeout logic
  useEffect(() => {
    console.log('Session timeout effect running, currentSessionId:', currentSessionId, 'sessionTimeout:', sessionTimeout);
    
    // Clear any existing timeout when session changes
    if (sessionTimeout) {
      console.log('Clearing existing timeout');
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
    
    // Set up new timeout if we have a session
    if (currentSessionId) {
      console.log('Setting up session timeout for:', currentSessionId);
      const timeout = setTimeout(() => {
        console.log('Session timed out:', currentSessionId);
        showNotification('Session timed out');
        setCurrentSessionId(null);
        setCurrentSessionStartTime(null);
        setSessionTimeout(null);
      }, SESSION_TIMEOUT_MS);
      
      setSessionTimeout(timeout);
    }

    // Cleanup function
    return () => {
      // Don't clear timeout in cleanup if we're just re-running the effect
      // The timeout will be cleared at the start of the next effect run
    };
  }, [currentSessionId, showNotification]); // Remove sessionTimeout from dependencies

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionTimeout) {
        console.log('Component unmounting - cleaning up session timeout');
        clearTimeout(sessionTimeout);
      }
    };
  }, [sessionTimeout]);

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

  const handleEmptyTap = useCallback(() => {
    console.log('Empty NFC tap detected - prompting user to retry');
    showNotification('Tap detected but no data received. Please tap your phone to the device again.');
  }, [showNotification]);

  const readNFCTag = useCallback(async (): Promise<CompactNFCPayload | null> => {
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
      
      // Check if this is an empty tap (tag detected but no data received)
      if (nfcService && nfcService.isEmptyTap(error)) {
        handleEmptyTap();
        return null; // Return null instead of throwing for empty taps
      }
      
      throw error;
    } finally {
      setIsReading(false);
    }
  }, [isNFCSupported, isNFCEnabled, handleEmptyTap]);

  const startListening = useCallback(async () => {
    if (Platform.OS === 'web' || !nfcService) {
      throw new Error('NFC not available on web platform');
    }

    if (!isNFCSupported || !isNFCEnabled) {
      throw new Error('NFC not available');
    }

    try {
      await nfcService.startTagListener(async (payload: CompactNFCPayload) => {
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

    const processNFCPayload = useCallback(async (payload: CompactNFCPayload) => {
    console.log('processNFCPayload called with user:', user);
    console.log('User state:', { user: user ? 'present' : 'null', userId: user?.userId, isLoading });
    
    // If no user in context, check Firebase Auth directly and wait if needed
    let effectiveUser = user;
    if (!user) {
      console.log('No user in context, checking Firebase Auth directly...');
      
      // Check Firebase Auth current user
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        console.log('Firebase Auth user found:', firebaseUser.uid);
        // Create a temporary user object for NFC processing
        effectiveUser = {
          userId: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
        };
        console.log('Using Firebase user for NFC processing:', effectiveUser.userId);
      } else {
        // No Firebase user either, wait a bit in case auth is still initializing
        showNotification('Checking authentication...');
        const maxWaitTime = 3000;
        const startTime = Date.now();
        
        while (!auth.currentUser && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (auth.currentUser) {
          effectiveUser = {
            userId: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || '',
          };
          console.log('Firebase user found after waiting:', effectiveUser.userId);
        } else {
          console.error('No Firebase Auth user found after waiting');
          showNotification('Please log in to use NFC features');
          return;
        }
      }
    }

    if (!effectiveUser) {
      console.error('No user authenticated after all checks');
      showNotification('Please log in to use NFC features');
      return;
    }

    console.log('Processing NFC payload with user:', effectiveUser.userId);

    // Check if this is the same payload as last time (duplicate tap)
    if (lastPayload && isDuplicateTap(payload, lastPayload)) {
      console.log('Duplicate NFC tap detected');
      showNotification(
        `Session already active on ${payload.m}. Start working out!`
      );
      return;
    }

    // Check if this is a tap out (current session matches any of the session IDs with workout data)
    // Use ref as fallback if state is lost due to re-renders
    const effectiveSessionId = currentSessionId || sessionStateRef.current.sessionId;
    console.log('Current session ID:', currentSessionId);
    console.log('Session ref ID:', sessionStateRef.current.sessionId);
    console.log('Effective session ID:', effectiveSessionId);
    console.log('Payload sessions:', payload.s);
    
    const matchedSession = findMatchingCompactSession(payload, effectiveSessionId);
    if (matchedSession) {
      console.log(`Tap out detected - found session data in ${matchedSession.role}`);
      await handleTapOut(payload, matchedSession);
      return;
    }

    // This is a tap in (new session)
    console.log('Tap in detected - starting new session');
    await handleTapIn(payload);

  }, [user, lastPayload, currentSessionId, currentSessionStartTime, showNotification]);

  const handleTapIn = useCallback(async (payload: CompactNFCPayload) => {
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
      console.log('Setting current session ID to:', payload.a);
      setCurrentSessionId(payload.a);
      setCurrentSessionStartTime(Date.now());
      
      // Also update the ref to persist across re-renders
      sessionStateRef.current.sessionId = payload.a;
      sessionStateRef.current.startTime = Date.now();
      
      showNotification(
        `Started session on ${payload.m}`
      );

    } catch (error) {
      console.error('Failed to handle tap in:', error);
      showNotification('Failed to start session');
    }
  }, [user, isLoading, currentWorkout, startWorkout, currentSessionId, sessionTimeout, showNotification]);

  const handleTapOut = useCallback(async (payload: CompactNFCPayload, matchedSession?: MatchedSessionData) => {
    // Check for user in context, fallback to Firebase Auth
    let currentUser = user;
    if (!currentUser) {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        currentUser = {
          userId: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
        };
      }
    }
    
    if (!currentUser) {
      console.error('No user available for tap out');
      return;
    }

    // Determine which workout to use
    let activeWorkout = currentWorkout;
    if (!activeWorkout) {
      console.error('No active workout - attempting to start one');
      try {
        activeWorkout = await startWorkout();
        console.log('Created new workout for tap out:', activeWorkout.workoutId);
        // Note: startWorkout should update the workout context's currentWorkout automatically
      } catch (error) {
        console.error('Failed to start workout for tap out:', error);
        showNotification('Failed to process workout data');
        return;
      }
    }

    try {
      // Clear session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }

      // Process session data - either matched session or no current session data for tap-ins
      if (matchedSession && matchedSession.sets.length > 0) {
        // Recovery mode - use the matched session data
        console.log('Recovering session from device:', matchedSession);

        // Calculate session timing using app's tap-in time and current time
        const tapOutTime = Date.now();
        const tapInTime = currentSessionStartTime || sessionStateRef.current.startTime || (tapOutTime - SESSION_MAX_AGE_MS); // Fallback if no start time
        
        // Convert to ExerciseSession format
        const session = convertCompactSessionToExerciseSession(
          payload,
          matchedSession.role,
          currentUser.userId,
          activeWorkout.workoutId,
          tapInTime,
          tapOutTime
        );

        if (session) {
          console.log('Saving exercise session:', session);
          await addExerciseSession(session);
          showNotification(`Recovered workout: ${matchedSession.sets.length} sets on ${payload.m}`);
        }
      } else {
        // Normal tap-out from fresh session (session_id_a) - no workout data to save yet
        console.log('Tapping out from fresh session - no workout data available');
        showNotification('Session ended - no workout data recorded yet');
      }

      // Clear current session
      console.log('Clearing current session after tap out');
      setCurrentSessionId(null);
      setCurrentSessionStartTime(null);
      
      // Also clear the ref
      sessionStateRef.current.sessionId = null;
      sessionStateRef.current.startTime = null;

    } catch (error) {
      console.error('Failed to handle tap out:', error);
      showNotification('Failed to save workout data');
    }
  }, [currentWorkout, user, addExerciseSession, sessionTimeout, currentSessionStartTime, showNotification, startWorkout]);

  const clearCurrentSession = useCallback(() => {
    console.log('clearCurrentSession called');
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
    setCurrentSessionId(null);
    setCurrentSessionStartTime(null);
    
    // Also clear the ref
    sessionStateRef.current.sessionId = null;
    sessionStateRef.current.startTime = null;
    sessionStateRef.current.timeout = null;
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
    handleEmptyTap,
  };
});
