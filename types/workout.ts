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
  // Duration will be calculated from app timestamps, not device data
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
// Compact NFC payload format (size-optimized)
export interface CompactNFCPayload {
  m: string;                    // machine_id
  t: string;                    // machine_type  
  a: string;                    // next session (A) id, base36 short id (6 chars)
  s: Array<[                   // sessions array
    string,                     // role: "b" (active), "c" (last completed), "d" (older completed)
    string,                     // session id, base36 6-char
    Array<[number, number]>     // sets: [weight_lbs, reps] (weight can be -1 if unknown)
  ]>;
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