# NFC Device Compatibility - Implementation Plan

## ✅ APPROVED SOLUTION: NDEF with MIME Records

### Device Implementation Plan (CONFIRMED)
The device team will implement NDEF formatting on ST25DV16K tags using:

**NDEF Structure:**
- **Capability Container (CC)** at memory start
- **NDEF TLV (0x03)** containing single NDEF message  
- **Single NDEF Record** with TNF=Media-type (MIME)
- **MIME Type**: `application/json`
- **Payload**: Raw JSON string (no schema changes)
- **Terminator TLV (0xFE)** after message

**Safe Update Sequence:**
1. Set NDEF TLV length to 0 (invalidate)
2. Write complete NDEF record payload  
3. Set correct NDEF TLV length (validate)
4. Ensure terminator TLV in place

### App Compatibility (READY)
✅ **MIME Record Support**: App now detects `application/json` MIME records  
✅ **Fallback Support**: Still handles Text records for compatibility  
✅ **JSON Parsing**: No changes needed to payload structure  
✅ **iOS Compatible**: NDEF reading works on iOS Core NFC

### Technical Specifications

**NDEF Record Format:**
```
TNF: 0x02 (Media-type/MIME)
Type: "application/json" (15 bytes)
Payload: JSON string (variable, ~300 bytes typical)
```

**Memory Layout:**
```
Block 0-1: Capability Container (CC)
Block 2+:  NDEF TLV + Record + Terminator
Remaining: Available for future use
```

**Size Constraints:**
- Tag Size: 2KB total
- Payload Cap: 1KB (recommended safety limit)
- Current Usage: ~300 bytes (comfortable margin)

### Benefits of This Approach

1. **iOS Compatibility**: Native NDEF reading support
2. **Standards Compliant**: Works with generic NFC tools
3. **Semantic Correctness**: JSON as MIME type, not text
4. **Safe Updates**: Two-phase write prevents corruption
5. **Tool Support**: NFC Tools, ST apps can read/display
6. **Future Proof**: Room for payload growth within limits

### Testing Plan

**Phase 1: Basic NDEF**
- [ ] Format device with Type 5 NDEF structure
- [ ] Test iOS app NDEF reading
- [ ] Verify with NFC Tools app
- [ ] Confirm JSON parsing works

**Phase 2: Write Cycles** 
- [ ] Exercise set finalize → verify JSON update
- [ ] Tap-out rotation → verify session data rotation
- [ ] Multiple rapid updates → verify safe update sequence

**Phase 3: Edge Cases**
- [ ] Read during write → app retry logic
- [ ] Large payloads → size limit enforcement  
- [ ] Generic NFC tool compatibility

### Device Questions - ANSWERED

**Q: MIME type `application/json` acceptable?**  
✅ **YES** - Perfect choice, app ready to handle

**Q: Single record sufficient?**  
✅ **YES** - One JSON record contains all needed data

**Q: Maximum payload size?**  
✅ **1KB recommended cap** - Current ~300 bytes, plenty of headroom

---

## Previous Research (Historical)

### iOS NFC Limitations Discovered
iOS Core NFC framework cannot read raw memory from ISO15693 tags:
- Only provides basic identification (ID, manufacturer, serial)
- No access to user data memory or raw memory blocks
- NDEF reading works perfectly

### Alternative Options Evaluated
1. **NTAG213/215/216**: Good iOS support but hardware change required
2. **Raw Memory**: Works Android only, iOS incompatible  
3. **NDEF Format**: ✅ Chosen solution - universal compatibility

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