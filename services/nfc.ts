import NfcManager, { NfcTech, Ndef, TagEvent, NfcEvents } from 'react-native-nfc-manager';
import { NFCPayload } from '@/types/workout';

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
    try {
      return await NfcManager.isEnabled();
    } catch (error) {
      console.error('Failed to check NFC status:', error);
      return false;
    }
  }

  async readNFCTag(): Promise<NFCPayload | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('NFC not available on this device');
      }
    }

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
      const tagEventListener = NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag: TagEvent) => {
        try {
          console.log('Tag discovered:', tag);
          
          if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
            console.warn('No NDEF data found on discovered tag');
            return;
          }

          const record = tag.ndefMessage[0];
          if (!record?.payload) {
            console.warn('No payload found in NDEF record');
            return;
          }

          const payloadString = this.parseNdefPayload(record.payload);
          const nfcData = JSON.parse(payloadString) as NFCPayload;
          
          onTagDetected(nfcData);
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
