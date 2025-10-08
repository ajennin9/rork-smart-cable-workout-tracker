import { Platform } from 'react-native';
import { NFCPayload } from '@/types/workout';

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

    try {
      // First try ISO15693 for raw memory reading
      try {
        const payload = await this.readISO15693RawMemory();
        if (payload) {
          return payload;
        }
      } catch (iso15693Error) {
        console.log('ISO15693 read failed, falling back to NDEF:', iso15693Error);
      }

      // Fallback to NDEF reading for compatibility
      return await this.readNDEFTag();

    } catch (error) {
      console.error('Failed to read NFC tag:', error);
      throw error;
    }
  }

  private async readISO15693RawMemory(): Promise<NFCPayload | null> {
    try {
      // Request ISO15693 technology (also known as NfcV)
      await NfcManager.requestTechnology(NfcTech.NfcV);
      
      const tag = await NfcManager.getTag();
      console.log('ISO15693 Tag detected:', tag);

      if (!tag || !tag.tech?.includes('iso15693')) {
        throw new Error('Not an ISO15693 tag');
      }

      // Log available NfcManager methods for debugging
      console.log('Available NfcManager methods:', Object.getOwnPropertyNames(NfcManager));

      // Try to read the tag's raw user data area
      // Different approaches based on available methods
      let allBytes: number[] = [];
      
      // Method 1: Try direct memory reading if available
      if (typeof NfcManager.nfcVHandlerReadSingleBlock === 'function') {
        console.log('Using nfcVHandlerReadSingleBlock method');
        allBytes = await this.readBlocksSequentially(NfcManager.nfcVHandlerReadSingleBlock.bind(NfcManager));
      } else if (typeof NfcManager.iso15693HandlerReadSingleBlock === 'function') {
        console.log('Using iso15693HandlerReadSingleBlock method');
        allBytes = await this.readBlocksSequentially(NfcManager.iso15693HandlerReadSingleBlock.bind(NfcManager));
      } else if (typeof NfcManager.readNfcVSingleBlock === 'function') {
        console.log('Using readNfcVSingleBlock method');
        allBytes = await this.readBlocksSequentially(NfcManager.readNfcVSingleBlock.bind(NfcManager));
      } else {
        // Method 2: Try to extract raw data from tag object if methods aren't available
        console.log('No block reading methods available, checking tag object for raw data');
        
        if (tag.userData) {
          console.log('Found userData in tag:', tag.userData);
          allBytes = Array.isArray(tag.userData) ? tag.userData : Array.from(tag.userData);
        } else if (tag.memory) {
          console.log('Found memory in tag:', tag.memory);
          allBytes = Array.isArray(tag.memory) ? tag.memory : Array.from(tag.memory);
        } else if (tag.data) {
          console.log('Found data in tag:', tag.data);
          allBytes = Array.isArray(tag.data) ? tag.data : Array.from(tag.data);
        } else {
          throw new Error('No method available to read ISO15693 raw memory');
        }
      }

      if (allBytes.length === 0) {
        throw new Error('No data found in ISO15693 memory');
      }

      // Convert bytes to string
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

      // Convert payload to string (assuming UTF-8 encoding)
      const payloadString = this.parseNdefPayload(record.payload);
      console.log('Raw NFC payload:', payloadString);

      // Parse JSON
      try {
        const nfcData = JSON.parse(payloadString) as NFCPayload;
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

  private async parseJSONWithRetry(jsonData: string, maxRetries: number = 3): Promise<NFCPayload> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Clean up the JSON string
        const cleanJson = jsonData.trim();
        
        if (!cleanJson) {
          throw new Error('Empty JSON data');
        }

        // Attempt to parse
        const payload = JSON.parse(cleanJson) as NFCPayload;
        
        // Basic validation
        if (!payload.v || !payload.machine_id || !payload.session_id_a) {
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
}

export const nfcService = NFCService.getInstance();
