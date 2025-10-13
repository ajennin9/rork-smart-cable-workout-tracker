/**
 * Mock NDEF data for testing iOS NFC compatibility
 * This simulates what your RORK device should write to the NFC tag
 * in NDEF format for iOS compatibility
 */

import { CompactNFCPayload } from '@/types/workout';

// Test NDEF payload that your device should write
export const testNdefPayload: CompactNFCPayload = {
  m: "rork_cable_001",    // machine_id
  t: "bicep",             // machine_type
  a: "q9k2x7",           // current session id (base36)
  s: [                    // sessions array
    ["b", "ab12cd", [[25,12], [25,10], [20,15]]],    // active session
    ["c", "ef34gh", [[20,15], [22,12]]],              // last completed
    ["d", "ij56kl", [[18,18]]]                        // older completed
  ]
};

// This is what the NDEF record should look like when written by your device
export const expectedNdefRecord = {
  tnf: 0x02, // Media-type (MIME) 
  type: new TextEncoder().encode('application/json'), // "application/json" as bytes
  id: [],
  payload: new TextEncoder().encode(JSON.stringify(testNdefPayload)) // Raw JSON bytes
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
  0xD2, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=2 (Media-type)
  0x10, // Type Length = 16 ("application/json")
  0x00, // Payload Length (high byte, will be calculated)
  0x00, // Payload Length (low byte, will be calculated)
  
  // Type field: "application/json"
  0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x6A, 0x73, 0x6F, 0x6E,
  
  // Payload: Raw JSON bytes follow...
  
  // NDEF TLV terminator
  0xFE
];

export default testNdefPayload;