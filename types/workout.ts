export interface User {
  userId: string;
  email: string;
  displayName: string;
  nickname?: string;
  preferredWeightUnit?: 'lbs' | 'kg'; // Default to 'lbs'
}

export interface Machine {
  machineId: string;
  machineType: string;
  machineName?: string;
}

export interface Set {
  setId: string;
  sessionId: string;
  weightLbs: number;
  reps: number;
  durationMs: number;
}

export interface ExerciseSession {
  sessionId: string;
  userId: string;
  workoutId: string;
  machineId: string;
  machineType: string;
  startedAt: string;
  endedAt: string;
  sets: Omit<Set, 'setId' | 'sessionId'>[];
}

export interface WorkoutSession {
  workoutId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  exerciseSessions: ExerciseSession[];
  totalVolume?: number;
  totalSets?: number;
}

export interface SessionSummary {
  sessionId: string;
  userId: string;
  machineId: string;
  dateKey: string;
  totalVolume: number;
  setCount: number;
}

// NFC Payloads
export interface NFCPayload {
  v: number;                    // Version
  machine_id: string;           // Machine identifier
  machine_name?: string;        // Human readable name
  machine_type: string;         // Type of machine
  fw?: string;                  // Firmware version
  
  // Exercise information
  exercise_id: string;          // Exercise identifier
  exercise_name?: string;       // Human readable exercise name
  
  // Multiple session IDs (newest first priority)
  session_id_a: string;         // Current/newest session (fresh tap-in)
  session_id_b?: string;        // Previous session
  session_id_c?: string;        // Session before that
  session_id_d?: string;        // Oldest session
  
  // Session data for completed sessions (only b, c, d have workout data)
  session_data_b?: {
    session_duration_ms: number; // Total exercise time (first rep to last rep)
    sets: Array<{
      weight_lbs: number;       // Weight in lbs
      reps: number;             // Reps
      duration_ms: number;      // Individual set duration
    }>;
  };
  
  session_data_c?: {
    session_duration_ms: number; // Total exercise time (first rep to last rep)
    sets: Array<{
      weight_lbs: number;       // Weight in lbs
      reps: number;             // Reps
      duration_ms: number;      // Individual set duration
    }>;
  };
  
  session_data_d?: {
    session_duration_ms: number; // Total exercise time (first rep to last rep)
    sets: Array<{
      weight_lbs: number;       // Weight in lbs
      reps: number;             // Reps
      duration_ms: number;      // Individual set duration
    }>;
  };
}

// Legacy interfaces for backward compatibility
export interface NFCHelloPayload {
  v: number;
  op: 'HELLO';
  machine_id: string;
  machine_type: string;
  fw: string;
}

export interface NFCSessionPayload {
  v: number;
  op: 'SESSION';
  machine_id: string;
  seq?: number;
  session: {
    s: number;
    e: number;
    sets: {
      w: number; // Weight in lbs
      r: number;
      d: number;
    }[];
  };
  sig?: string;
}