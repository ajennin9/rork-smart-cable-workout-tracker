import { NFCPayload } from '@/types/workout';

// Mock NFC payloads for development and testing
export const createMockNFCPayload = (
  machineName: string = 'Lat Pulldown',
  machineId: string = 'machine-001',
  isWithWorkoutData: boolean = false
): NFCPayload => {
  const currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const completedSessionId = isWithWorkoutData 
    ? `session-${Date.now() - 360000}-${Math.random().toString(36).substr(2, 9)}`
    : undefined;

  const basePayload: NFCPayload = {
    v: 1,
    machine_id: machineId,
    machine_name: machineName,
    machine_type: 'cable_stack',
    session_id_a: currentSessionId, // Current/newest session
    fw: '1.2.0',
    exercise_id: 'lat-pulldown',
    exercise_name: 'Lat Pulldown',
  };

  if (isWithWorkoutData && completedSessionId) {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 360; // 6 minutes ago
    
    // Add completed session data to slot b
    basePayload.session_id_b = completedSessionId;
    basePayload.session_data_b = {
      start_time: startTime,
      end_time: endTime,
      sets: [
        { weight_lbs: 90, reps: 12, duration_ms: 45000 },
        { weight_lbs: 95, reps: 10, duration_ms: 40000 },
        { weight_lbs: 100, reps: 8, duration_ms: 35000 },
      ],
    };
  }

  return basePayload;
};

// Test payloads for different scenarios
export const mockNFCPayloads = {
  // First tap on a machine (tap in)
  tapIn: createMockNFCPayload('Lat Pulldown', 'machine-001', false),
  
  // Tap out with workout data
  tapOutWithData: createMockNFCPayload('Lat Pulldown', 'machine-001', true),
  
  // Different machines
  chestPress: createMockNFCPayload('Chest Press', 'machine-003', false),
  legPress: createMockNFCPayload('Leg Press', 'machine-004', false),
  
  // Tap out scenarios
  chestPressComplete: createMockNFCPayload('Chest Press', 'machine-003', true),
};

// Helper to create recovery scenario with multiple sessions
export const createRecoveryPayload = (
  machineId: string = 'machine-001',
  machineName: string = 'Cable Row'
): NFCPayload => {
  const now = Date.now();
  
  return {
    v: 1,
    machine_id: machineId,
    machine_name: machineName,
    machine_type: 'cable_machine',
    fw: '1.2.0',
    exercise_id: 'cable-row',
    exercise_name: 'Cable Row',
    
    // Current session (fresh)
    session_id_a: `session-${now}-new`,
    
    // Recent completed sessions (within 1 hour)
    session_id_b: `session-${now - 600000}-recent`, // 10 min ago
    session_data_b: {
      start_time: Math.floor((now - 900000) / 1000), // 15 min ago
      end_time: Math.floor((now - 600000) / 1000),   // 10 min ago
      sets: [
        { weight_lbs: 80, reps: 10, duration_ms: 30000 },
        { weight_lbs: 85, reps: 8, duration_ms: 28000 },
        { weight_lbs: 80, reps: 10, duration_ms: 32000 },
      ],
    },
    
    session_id_c: `session-${now - 1800000}-older`, // 30 min ago
    session_data_c: {
      start_time: Math.floor((now - 2100000) / 1000), // 35 min ago
      end_time: Math.floor((now - 1800000) / 1000),   // 30 min ago
      sets: [
        { weight_lbs: 75, reps: 12, duration_ms: 35000 },
        { weight_lbs: 80, reps: 10, duration_ms: 30000 },
      ],
    },
  };
};

// Helper to simulate the NFC tag discovery for testing
export const simulateNFCRead = async (payload: NFCPayload): Promise<NFCPayload> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  console.log('Simulated NFC read:', payload);
  return payload;
};

// Export for backward compatibility with existing mock system
export const generateMockNFCTapIn = () => mockNFCPayloads.tapIn;
export const generateMockNFCTapOut = () => mockNFCPayloads.tapOutWithData;
