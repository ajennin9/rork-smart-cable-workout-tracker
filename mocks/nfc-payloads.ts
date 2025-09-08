import { NFCPayload } from '@/types/workout';

// Mock NFC payloads for development and testing
export const createMockNFCPayload = (
  machineName: string = 'Lat Pulldown',
  machineId: string = 'machine-001',
  isWithWorkoutData: boolean = false
): NFCPayload => {
  const tapInSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const tapOutSessionId = isWithWorkoutData 
    ? `session-${Date.now() - 360000}-${Math.random().toString(36).substr(2, 9)}`
    : `session-${Date.now() - 3600000}-${Math.random().toString(36).substr(2, 9)}`;

  const basePayload: NFCPayload = {
    v: 1,
    machine_id: machineId,
    machine_name: machineName,
    machine_type: 'cable_stack',
    session_id_tap_in: tapInSessionId,
    session_id_tap_out: tapOutSessionId,
    fw: '1.2.0',
  };

  if (isWithWorkoutData) {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 360; // 6 minutes ago
    
    basePayload.session_data = {
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
