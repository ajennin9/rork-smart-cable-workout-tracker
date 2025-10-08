# NFC Device Compatibility Recommendations

## Current Issue
iOS Core NFC framework has limited support for reading raw memory from ISO15693 tags. While the tag is detected, iOS only provides basic identification data:
- Tag ID
- Manufacturer Code  
- Serial Number
- Technology Type

No access to user data memory or raw memory blocks.

## Recommended Solutions

### Option 1: NDEF Format (Highly Recommended)
Format your JSON data as NDEF records instead of raw memory writes:

**NDEF Text Record Structure:**
```
- NDEF Header
- Type: "T" (Text Record)
- Language: "en" 
- Payload: Your JSON string
```

**Device Implementation:**
```c
// Instead of raw memory write to address 0x0000
// Write as NDEF Text Record
ndef_text_record_t record = {
    .type = NDEF_TYPE_TEXT,
    .language = "en",
    .payload = json_string,
    .payload_length = strlen(json_string)
};
write_ndef_record(&record);
```

### Option 2: Alternative NFC Tag Types
Consider using NFC tag types with better iOS support:

**NTAG213/215/216 (Type 2)**
- Full iOS compatibility
- 144/504/924 bytes user memory
- Direct memory access available
- Better for small JSON payloads

**MIFARE Classic (if supported by device)**
- Good iOS support via Core NFC
- Multiple sectors available
- Well-documented iOS APIs

### Option 3: Enhanced ST25DV Configuration
If staying with ST25DV, ensure NDEF formatting:

**ST25DV NDEF Setup:**
1. Write Capability Container (CC) at block 0
2. Format NDEF TLV structure
3. Write JSON as NDEF Text Record
4. Update NDEF length in TLV

## Current App Support
The app already supports NDEF reading and will automatically:
1. Try ISO15693 raw memory (for Android/other platforms)
2. Fall back to NDEF reading (for iOS compatibility)
3. Parse JSON from either source

## Testing Recommendations
1. Format one tag with NDEF containing sample JSON
2. Test with iOS app to verify reading works
3. Compare performance vs raw memory approach
4. Consider hybrid approach: raw memory for Android, NDEF for iOS

## Sample NDEF JSON Structure
```json
{
  "session_id": "workout_123",
  "session_duration_ms": 1800000,
  "session_data_b": {
    "exercise_1": {
      "name": "bicep_curl",
      "duration_ms": 30000,
      "resistance": 25
    }
  },
  "session_data_c": {},
  "session_data_d": {}
}
```

This should be written as an NDEF Text Record for maximum iOS compatibility.