import { NFCPayload } from '@/types/workout';

// Example NFC payload with multiple sessions (newest first priority)
// User just tapped in (session_a is new), previous users' workouts in b, c, d
export const exampleMultiSessionPayload: NFCPayload = {
  v: 1,
  machine_id: "machine-001",
  machine_name: "Lat Pulldown Station 1", 
  machine_type: "cable_stack",
  fw: "1.2.0",
  
  // Exercise information
  exercise_id: "lat-pulldown",
  exercise_name: "Lat Pulldown",
  
  // Session IDs (newest first)
  session_id_a: "session-20250912-143500-xyz789", // Current user just tapped in (NEW)
  session_id_b: "session-20250912-142800-abc456", // Previous user finished 7 mins ago
  session_id_c: "session-20250912-141200-def123", // User finished 23 mins ago
  session_id_d: "session-20250912-135800-ghi789", // User finished 37 mins ago
  
  // Session data (only for completed sessions b, c, d)
  // No session_data_a because it's a fresh tap-in
  
  session_data_b: {
    start_time: 1725722280, // 2:28 PM (7 minutes ago)
    end_time: 1725722640,   // 2:34 PM (1 minute ago)  
    sets: [
      { weight_lbs: 95, reps: 12, duration_ms: 48000 },
      { weight_lbs: 100, reps: 10, duration_ms: 45000 },
      { weight_lbs: 105, reps: 8, duration_ms: 42000 }
    ]
  },
  
  session_data_c: {
    start_time: 1725721320, // 2:12 PM (23 minutes ago)
    end_time: 1725721680,   // 2:18 PM (17 minutes ago)
    sets: [
      { weight_lbs: 80, reps: 15, duration_ms: 50000 },
      { weight_lbs: 85, reps: 12, duration_ms: 47000 },
      { weight_lbs: 90, reps: 10, duration_ms: 44000 },
      { weight_lbs: 90, reps: 8, duration_ms: 40000 }
    ]
  },
  
  session_data_d: {
    start_time: 1725719880, // 1:58 PM (37 minutes ago)  
    end_time: 1725720240,   // 2:04 PM (31 minutes ago)
    sets: [
      { weight_lbs: 110, reps: 8, duration_ms: 45000 },
      { weight_lbs: 115, reps: 6, duration_ms: 43000 },
      { weight_lbs: 120, reps: 5, duration_ms: 41000 }
    ]
  }
};

// Example where device hit payload limit (only newest sessions included)
export const exampleLimitedPayload: NFCPayload = {
  v: 1,
  machine_id: "machine-002",
  machine_name: "Chest Press Station 2",
  machine_type: "cable_stack", 
  fw: "1.2.0",
  
  // Exercise information
  exercise_id: "chest-press",
  exercise_name: "Chest Press",
  
  // Only 2 sessions due to payload size limit
  session_id_a: "session-20250912-144000-new123", // Fresh tap-in
  session_id_b: "session-20250912-143200-prev456", // Most recent completed
  // session_id_c and session_id_d omitted due to size constraints
  
  session_data_b: {
    start_time: 1725722720, // 2:32 PM  
    end_time: 1725723080,   // 2:38 PM
    sets: [
      { weight_lbs: 150, reps: 10, duration_ms: 50000 },
      { weight_lbs: 155, reps: 8, duration_ms: 48000 },
      { weight_lbs: 160, reps: 6, duration_ms: 45000 }
    ]
  }
};

// Scenario: User forgot to tap out, comes back after 2 other users
export const exampleForgottenTapOutScenario: NFCPayload = {
  v: 1,
  machine_id: "machine-003", 
  machine_name: "Leg Press Station 1",
  machine_type: "cable_stack",
  fw: "1.2.0",
  
  // Exercise information
  exercise_id: "leg-press",
  exercise_name: "Leg Press",
  
  session_id_a: "session-20250912-150000-current999", // Someone just tapped in
  session_id_b: "session-20250912-145200-user2-888",  // User 2 finished
  session_id_c: "session-20250912-144400-user3-777",  // User 3 finished  
  session_id_d: "session-20250912-143600-forgotten666", // Original user's session!
  
  session_data_b: {
    start_time: 1725723120, // User 2's workout
    end_time: 1725723480,
    sets: [
      { weight_lbs: 200, reps: 12, duration_ms: 55000 },
      { weight_lbs: 220, reps: 10, duration_ms: 52000 }
    ]
  },
  
  session_data_c: {
    start_time: 1725722640, // User 3's workout  
    end_time: 1725723000,
    sets: [
      { weight_lbs: 180, reps: 15, duration_ms: 48000 },
      { weight_lbs: 190, reps: 12, duration_ms: 46000 }
    ]
  },
  
  session_data_d: {
    start_time: 1725722160, // Original user's "forgotten" workout
    end_time: 1725722520,
    sets: [
      { weight_lbs: 160, reps: 10, duration_ms: 45000 },
      { weight_lbs: 170, reps: 8, duration_ms: 43000 },
      { weight_lbs: 180, reps: 6, duration_ms: 40000 }
    ]
  }
};

console.log("Multi-session NFC payload examples created!");
