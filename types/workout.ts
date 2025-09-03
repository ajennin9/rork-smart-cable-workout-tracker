export interface User {
  userId: string;
  email: string;
  displayName: string;
  nickname?: string;
}

export interface Machine {
  machineId: string;
  machineType: string;
  machineName?: string;
}

export interface Set {
  setId: string;
  sessionId: string;
  weightKg: number;
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
      w: number;
      r: number;
      d: number;
    }[];
  };
  sig?: string;
}