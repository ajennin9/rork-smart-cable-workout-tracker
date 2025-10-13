import { Platform } from 'react-native';
import { CompactNFCPayload } from '@/types/workout';

// Conditional imports for NFC (only on native platforms)
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;
let NfcEvents: any = null;

if (Platform.OS !== 'web') {
  try {
    const nfcModule = require('react-native-nfc-manager');
    NfcManager = nfcModule.default;
    NfcTech = nfcModule.NfcTech;
    Ndef = nfcModule.Ndef;
    NfcEvents = nfcModule.NfcEvents;
  } catch (error) {
    console.warn('react-native-nfc-manager not available:', error);
  }
}

export class NFCService {
  private static instance: NFCService;
  private isInitialized = false;

  static getInstance(): NFCService {
    if (!NFCService.instance) {
      NFCService.instance = new NFCService();
    }
    return NFCService.instance;
  }

  async initialize(): Promise<boolean> {
    if (Platform.OS === 'web' || !NfcManager) {
      console.log('NFC not available on web platform');
      return false;
    }

    try {
      const supported = await NfcManager.isSupported();
      if (!supported) {
        console.log('NFC not supported on this device');
        return false;
      }

      await NfcManager.start();
      this.isInitialized = true;
      console.log('NFC Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize NFC Manager:', error);
      return false;
    }
  }

  async isEnabled(): Promise<boolean> {
    if (Platform.OS === 'web' || !NfcManager) {
      return false;
    }
    
    try {
      return await NfcManager.isEnabled();
    } catch (error) {
      console.error('Failed to check NFC status:', error);
      return false;
    }
  }

  async readTag(): Promise<NFCPayload> {
    if (Platform.OS === 'web' || !NfcManager) {
      throw new Error('NFC not available on web platform');
    }

    if (!this.isInitialized) {
      throw new Error('NFC Manager not initialized');
    }

    // Retry logic for intermittent NFC read failures
    const maxRetries = 3;
    const retryDelay = 500; // 500ms between retries
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`NFC read attempt ${attempt}/${maxRetries}`);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('NFC read timeout')), 10000); // 10 second timeout
        });

        // First try ISO15693 for raw memory reading
        try {
          const iso15693Promise = this.readISO15693RawMemory();
          const payload = await Promise.race([iso15693Promise, timeoutPromise]);
          if (payload) {
            console.log(`NFC read successful on attempt ${attempt}`);
            return payload;
          }
        } catch (iso15693Error) {
          console.log(`ISO15693 read failed on attempt ${attempt}, falling back to NDEF:`, iso15693Error);
          
          // Make sure to cleanup any pending requests
          try {
            await NfcManager.cancelTechnologyRequest();
          } catch (cleanupError) {
            console.log('Cleanup error after ISO15693 failure:', cleanupError);
          }
        }

        // Fallback to NDEF reading for compatibility
        try {
          const ndefPromise = this.readNDEFTag();
          const payload = await Promise.race([ndefPromise, timeoutPromise]);
          console.log(`NFC NDEF read successful on attempt ${attempt}`);
          return payload;
        } catch (ndefError) {
          console.log(`NDEF read failed on attempt ${attempt}:`, ndefError);
          
          // Cleanup before retry
          try {
            await NfcManager.cancelTechnologyRequest();
          } catch (cleanupError) {
            console.log('Cleanup error after NDEF failure:', cleanupError);
          }
          
          // If this was the last attempt, throw the error
          if (attempt === maxRetries) {
            throw ndefError;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

      } catch (error) {
        console.error(`NFC read attempt ${attempt} failed:`, error);
        
        // Ensure cleanup
        try {
          await NfcManager.cancelTechnologyRequest();
        } catch (cleanupError) {
          console.log('Cleanup error:', cleanupError);
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // This should never be reached due to the throw in the loop
    throw new Error('NFC read failed after all retry attempts');
  }

  private async readISO15693RawMemory(): Promise<NFCPayload | null> {
    try {
      // For iOS, try different technology request approaches
      let tag: any = null;
      
      // Try NfcV technology first (iOS standard for ISO15693)
      try {
        await NfcManager.requestTechnology(NfcTech.NfcV || 'NfcV');
        tag = await NfcManager.getTag();
        console.log('ISO15693 Tag detected via NfcV:', tag);
      } catch (nfcVError) {
        console.log('NfcV failed, trying alternative approach:', nfcVError);
        
        // Try with Iso15693 if available
        try {
          await NfcManager.requestTechnology(NfcTech.Iso15693 || 'Iso15693');
          tag = await NfcManager.getTag();
          console.log('ISO15693 Tag detected via Iso15693:', tag);
        } catch (iso15693Error) {
          console.log('Iso15693 failed, trying NDEF as fallback:', iso15693Error);
          throw new Error('Could not establish ISO15693 connection');
        }
      }
      
      // Check available methods for block reading
      const availableMethods = Object.getOwnPropertyNames(NfcManager).filter(key => 
        typeof NfcManager[key] === 'function'
      );
      console.log('Available NfcManager methods:', availableMethods);
      
      // FIRST: Check if tag already contains NDEF message (device team's implementation)
      if (tag?.ndefMessage && tag.ndefMessage.length > 0) {
        console.log('Found NDEF message in ISO15693 tag object!');
        const record = tag.ndefMessage[0];
        
        if (record?.payload) {
          console.log('NDEF Record type:', record.type);
          console.log('NDEF Record TNF:', record.tnf);
          
          // Check if this is our expected application/json MIME record
          if (this.isJsonMimeRecord(record)) {
            console.log('Found application/json MIME record in ISO15693 tag');
            // For MIME records, payload is the raw JSON (no language prefix)
            const jsonData = this.bytesToString(record.payload);
            console.log('Raw NFC payload from ISO15693 NDEF:', jsonData);
            
            // Parse JSON and normalize to legacy format
            try {
              const rawData = JSON.parse(jsonData) as UnifiedNFCPayload;
              const nfcData = normalizePayload(rawData);
              console.log('Parsed NFC data from ISO15693 NDEF:', nfcData);
              return nfcData;
            } catch (parseError) {
              console.error('Failed to parse JSON from ISO15693 NDEF:', parseError);
              // Continue to fallback methods
            }
          } else {
            console.log('Found non-JSON NDEF record, trying standard parsing');
            // Fallback to standard NDEF text parsing
            const jsonData = this.parseNdefPayload(record.payload);
            console.log('Raw NFC payload from ISO15693 NDEF (text):', jsonData);
            
            try {
              const rawData = JSON.parse(jsonData) as UnifiedNFCPayload;
              const nfcData = normalizePayload(rawData);
              console.log('Parsed NFC data from ISO15693 NDEF (text):', nfcData);
              return nfcData;
            } catch (parseError) {
              console.error('Failed to parse JSON from ISO15693 NDEF (text):', parseError);
              // Continue to fallback methods
            }
          }
        }
      }
      
      let allBytes: number[] = [];

      // SECOND: Try raw memory reading methods (for backward compatibility)
      console.log('No NDEF found, checking tag object for raw data properties...');
      
      // Check if the tag object itself contains useful data
      if (tag?.rawData) {
        console.log('Found rawData in tag object:', tag.rawData);
        allBytes = Array.isArray(tag.rawData) ? tag.rawData : Array.from(tag.rawData);
      } else if (tag?.userData) {
        console.log('Found userData in tag:', tag.userData);
        allBytes = Array.isArray(tag.userData) ? tag.userData : Array.from(tag.userData);
      } else if (tag?.memory) {
        console.log('Found memory in tag:', tag.memory);
        allBytes = Array.isArray(tag.memory) ? tag.memory : Array.from(tag.memory);
      } else if (tag?.data) {
        console.log('Found data in tag:', tag.data);
        allBytes = Array.isArray(tag.data) ? tag.data : Array.from(tag.data);
      } else if (tag?.userMemory) {
        console.log('Found userMemory in tag:', tag.userMemory);
        allBytes = Array.isArray(tag.userMemory) ? tag.userMemory : Array.from(tag.userMemory);
      } else if (tag?.memoryContent) {
        console.log('Found memoryContent in tag:', tag.memoryContent);
        allBytes = Array.isArray(tag.memoryContent) ? tag.memoryContent : Array.from(tag.memoryContent);
      } else {
        // Log all available tag properties for debugging
        console.log('Available tag properties:', Object.keys(tag || {}));
        console.log('Complete tag object:', JSON.stringify(tag, null, 2));
        throw new Error('No NDEF data or raw memory accessible on iOS - tag may need NDEF formatting');
      }

      if (allBytes.length === 0) {
        throw new Error('No data read from ISO15693 tag');
      }

      // Convert bytes to string and parse JSON
      const jsonData = this.bytesToString(allBytes);
      console.log('Raw ISO15693 JSON data:', jsonData);

      // Parse JSON with retry logic for partial writes
      return await this.parseJSONWithRetry(jsonData);

    } catch (error) {
      console.error('ISO15693 read error:', error);
      throw error;
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        console.error('Failed to cancel ISO15693 request:', cancelError);
      }
    }
  }

  private async readBlocksSequentially(readBlockMethod: (blockNum: number) => Promise<any>): Promise<number[]> {
    const maxBlocks = 128;
    let allBytes: number[] = [];
    
    for (let blockNum = 0; blockNum < maxBlocks; blockNum++) {
      try {
        const blockData = await readBlockMethod(blockNum);
        
        if (!blockData || blockData.length === 0) {
          break; // No more data
        }

        // Convert to byte array if needed
        const bytes = Array.isArray(blockData) ? blockData : Array.from(blockData);
        allBytes = allBytes.concat(bytes);

        // Check for null terminator in the accumulated data
        const nullIndex = allBytes.indexOf(0);
        if (nullIndex !== -1) {
          // Found null terminator, truncate and stop
          allBytes = allBytes.slice(0, nullIndex);
          break;
        }

        // Safety check for reasonable JSON size
        if (allBytes.length > 2048) {
          console.warn('Data exceeds expected size, stopping read');
          break;
        }

      } catch (blockError) {
        console.error(`Failed to read block ${blockNum}:`, blockError);
        
        // If we have some data, try to parse it
        if (allBytes.length > 0) {
          break;
        }
        
        // If first block fails, this might not be the right approach
        if (blockNum === 0) {
          throw blockError;
        }
        
        // Otherwise just stop reading
        break;
      }
    }
    
    return allBytes;
  }

  private async readNDEFTag(): Promise<NFCPayload> {
    try {
      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // Read NDEF message
      const tag = await NfcManager.getTag();
      console.log('NFC Tag detected:', tag);

      if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
        throw new Error('No NDEF data found on tag');
      }

      // Parse the first NDEF record
      const record = tag.ndefMessage[0];
      if (!record?.payload) {
        throw new Error('No payload found in NDEF record');
      }

      console.log('NDEF Record type:', record.type);
      console.log('NDEF Record TNF:', record.tnf);

      // Convert payload to string based on record type
      let payloadString: string;
      
      // Check if this is our expected application/json MIME record
      if (record.type && this.isJsonMimeRecord(record)) {
        console.log('Found application/json MIME record');
        // For MIME records, payload is the raw JSON (no language prefix)
        payloadString = this.bytesToString(record.payload);
      } else {
        console.log('Found text or other record type, using standard parsing');
        // Fallback to standard NDEF text parsing (handles language codes)
        payloadString = this.parseNdefPayload(record.payload);
      }
      
      console.log('Raw NFC payload:', payloadString);

      // Parse JSON and normalize to legacy format
      try {
        const rawData = JSON.parse(payloadString) as UnifiedNFCPayload;
        const nfcData = normalizePayload(rawData);
        console.log('Parsed NFC data:', nfcData);
        return nfcData;
      } catch (parseError) {
        console.error('Failed to parse NFC JSON:', parseError);
        throw new Error('Invalid JSON format in NFC tag');
      }

    } catch (error) {
      console.error('NFC read error:', error);
      throw error;
    } finally {
      // Always cancel the NFC request
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        console.error('Failed to cancel NFC request:', cancelError);
      }
    }
  }

  private isJsonMimeRecord(record: any): boolean {
    // Check if this is a MIME record (TNF = 0x02) with application/json type
    const tnf = record.tnf;
    const type = record.type;
    
    // TNF 0x02 = Media-type (MIME)
    if (tnf === 0x02) {
      // Type should be "application/json"
      const typeString = Array.isArray(type) 
        ? String.fromCharCode(...type) 
        : type?.toString() || '';
      
      console.log('MIME type string:', typeString);
      return typeString === 'application/json';
    }
    
    return false;
  }

  private parseNdefPayload(payload: number[]): string {
    // Skip the first 3 bytes (language code) for Text records
    // Byte 0: flags, Byte 1: type length, Byte 2: payload length
    // For text records, bytes 3-5 are typically language code (e.g., 'en')
    const textPayload = payload.slice(3);
    
    // Convert byte array to string
    return String.fromCharCode(...textPayload);
  }

  private bytesToString(bytes: number[]): string {
    // Convert byte array directly to UTF-8 string
    return String.fromCharCode(...bytes);
  }

  private hexStringToBytes(hex: string): number[] {
    // Remove any spaces or colons and convert hex string to byte array
    const cleanHex = hex.replace(/[:\s]/g, '');
    const bytes = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substr(i, 2), 16));
    }
    return bytes;
  }

  private async parseJSONWithRetry(jsonData: string, maxRetries: number = 3): Promise<NFCPayload> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Clean up the JSON string
        const cleanJson = jsonData.trim();
        
        if (!cleanJson) {
          throw new Error('Empty JSON data');
        }

        // Attempt to parse and normalize
        const rawData = JSON.parse(cleanJson) as UnifiedNFCPayload;
        const payload = normalizePayload(rawData);
        
        // Basic validation for normalized payload
        if (!payload.machine_id || !payload.session_id_a) {
          throw new Error('Invalid NFC payload structure');
        }

        console.log('Successfully parsed ISO15693 JSON payload:', payload);
        return payload;

      } catch (parseError) {
        console.warn(`JSON parse attempt ${attempt}/${maxRetries} failed:`, parseError);
        
        if (attempt === maxRetries) {
          // Last attempt failed, check if it looks like partial write
          if (jsonData.includes('{') && !jsonData.includes('}')) {
            throw new Error('Partial write detected - device may still be writing data. Please try again.');
          } else {
            throw new Error(`Invalid JSON format after ${maxRetries} attempts: ${parseError}`);
          }
        }

        // Wait a bit before retry for potential write completion
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    throw new Error('Failed to parse JSON after all retries');
  }

  async stopReading(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.error('Failed to stop NFC reading:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
      await NfcManager.unregisterTagEvent();
    } catch (error) {
      console.error('Failed to cleanup NFC:', error);
    }
  }

  // Method to start listening for NFC tags (alternative to manual read)
  async startTagListener(onTagDetected: (payload: NFCPayload) => void): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('NFC not available on this device');
      }
    }

    try {
      // Register for tag detection
      await NfcManager.registerTagEvent();
      
      // Set up listener
      const tagEventListener = NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag: any) => {
        try {
          console.log('Tag discovered:', tag);
          
          // Try to read tag data using our main readTag method
          // This will try ISO15693 first, then fall back to NDEF
          const payload = await this.readTag();
          onTagDetected(payload);
          
        } catch (error) {
          console.error('Error processing discovered tag:', error);
        }
      });

      return tagEventListener;
    } catch (error) {
      console.error('Failed to start tag listener:', error);
      throw error;
    }
  }

  async stopTagListener(): Promise<void> {
    try {
      await NfcManager.unregisterTagEvent();
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    } catch (error) {
      console.error('Failed to stop tag listener:', error);
    }
  }

  // Handle empty tap detection (when tag is detected but no payload is available)
  isEmptyTap(error: any): boolean {
    // Check for various error patterns that indicate an empty tap
    const errorMessage = error?.message?.toLowerCase() || '';
    
    return (
      errorMessage.includes('no ndef data') ||
      errorMessage.includes('empty json') ||
      errorMessage.includes('invalid json') ||
      errorMessage.includes('nfc read timeout') ||
      errorMessage.includes('could not establish') ||
      // Add other patterns that indicate payload transmission failure
      (error && !errorMessage.includes('not supported') && !errorMessage.includes('not available'))
    );
  }

  // Create a method to handle the retry prompt
  handleEmptyTap(): { shouldRetry: boolean; message: string } {
    return {
      shouldRetry: true,
      message: 'Tap detected but no data received. Please tap your phone to the device again.'
    };
  }
}

export const nfcService = NFCService.getInstance();
