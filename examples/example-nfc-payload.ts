import { NFCPayload } from '@/types/workout';

// Example NFC payload for a completed workout session
// 3 sets of 10 reps at 80 lbs on a Lat Pulldown machine
export const exampleSessionPayload: NFCPayload = {
  v: 1,
  machine_id: "machine-001",
  machine_name: "Lat Pulldown Station 1", 
  machine_type: "cable_stack",
  session_id_tap_in: "session-20250907-143022-abc123",  // New session starting
  session_id_tap_out: "session-20250907-142015-def456", // Previous session ending
  fw: "1.2.0",
  
  // Session data from the completed workout (session_id_tap_out)
  session_data: {
    start_time: 1725721215,  // Unix timestamp: Sep 7, 2025 2:20:15 PM
    end_time: 1725721575,    // Unix timestamp: Sep 7, 2025 2:26:15 PM (6 minutes later)
    sets: [
      {
        weight_lbs: 80,      // 80 pounds
        reps: 10,            // 10 reps
        duration_ms: 45000   // 45 seconds for the set
      },
      {
        weight_lbs: 80,      // 80 pounds  
        reps: 10,            // 10 reps
        duration_ms: 42000   // 42 seconds for the set
      },
      {
        weight_lbs: 80,      // 80 pounds
        reps: 10,            // 10 reps  
        duration_ms: 40000   // 40 seconds for the set
      }
    ]
  }
};

// Example JSON string that would be stored on the NFC tag
export const exampleNFCTagData = JSON.stringify(exampleSessionPayload, null, 2);

console.log("Example NFC Tag JSON Data:");
console.log(exampleNFCTagData);
