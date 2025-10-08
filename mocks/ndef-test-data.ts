/**
 * Mock NDEF data for testing iOS NFC compatibility
 * This simulates what your RORK device should write to the NFC tag
 * in NDEF format for iOS compatibility
 */

import { NFCPayload } from '@/types/workout';

// Test NDEF payload that your device should write
export const testNdefPayload: NFCPayload = {
  v: 1,
  machine_id: "rork_cable_001", 
  machine_name: "RORK Smart Cable",
  machine_type: "cable_machine",
  fw: "1.0.0",
  
  exercise_id: "bicep_curl_001",
  exercise_name: "Bicep Curl",
  
  session_id_a: "current_session_123", // Current session (no data yet)
  session_id_b: "completed_session_122", // Previous completed session
  session_id_c: "completed_session_121", // Earlier completed session
  session_id_d: "completed_session_120", // Oldest completed session
  
  // Completed session data
  session_data_b: {
    session_duration_ms: 1800000, // 30 minutes total
    sets: [
      {
        weight_lbs: 25,
        reps: 12,
        duration_ms: 30000 // 30 seconds
      },
      {
        weight_lbs: 25,
        reps: 10,
        duration_ms: 25000 // 25 seconds
      },
      {
        weight_lbs: 20,
        reps: 15,
        duration_ms: 35000 // 35 seconds
      }
    ]
  },
  
  session_data_c: {
    session_duration_ms: 1200000, // 20 minutes total
    sets: [
      {
        weight_lbs: 20,
        reps: 15,
        duration_ms: 40000
      },
      {
        weight_lbs: 22,
        reps: 12,
        duration_ms: 35000
      }
    ]
  },
  
  session_data_d: {
    session_duration_ms: 900000, // 15 minutes total
    sets: [
      {
        weight_lbs: 18,
        reps: 18,
        duration_ms: 45000
      }
    ]
  }
};

// This is what the NDEF record should look like when written by your device
export const expectedNdefRecord = {
  type: [0x54], // "T" for Text Record
  id: [],
  payload: [
    0x02, // Status byte (UTF-8, language length = 2)
    0x65, 0x6E, // "en" language code
    ...new TextEncoder().encode(JSON.stringify(testNdefPayload))
  ]
};

// Raw NDEF message structure that your device should write
export const ndefMessage = {
  records: [expectedNdefRecord]
};

// For device development: this is the exact byte sequence to write to the tag
export const ndefBytes = [
  // NDEF TLV header
  0x03, // NDEF Message TLV
  0x00, 0xFF, // Length (will be calculated based on actual payload)
  
  // NDEF Record header
  0xD1, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=1 (Well-known type)
  0x01, // Type Length = 1
  0x00, // Payload Length (high byte, will be calculated)
  0x00, // Payload Length (low byte, will be calculated)
  0x54, // Type = "T" (Text)
  
  // Payload
  0x02, // Status: UTF-8, language length = 2
  0x65, 0x6E, // "en"
  // JSON payload bytes follow...
  
  // NDEF TLV terminator
  0xFE
];

export default testNdefPayload;