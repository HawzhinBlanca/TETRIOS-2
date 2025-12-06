
import { telemetry } from './TelemetryManager';

// Reliability Utility: Safe Storage Wrapper
// Handles SecurityError (Private Browsing), QuotaExceededError, and access restrictions.
// Includes Debouncing and Integrity Check (Checksum).

export type StorageErrorType = 'QUOTA' | 'SECURITY' | 'CORRUPTION' | 'UNKNOWN';

export interface StorageErrorPayload {
    type: StorageErrorType;
    message: string;
    key?: string;
    originalError?: any;
}

type ErrorCallback = (error: StorageErrorPayload) => void;

interface StorageEnvelope {
    data: any;
    hash: string;
}

class DebouncedStorage {
  private memory: Map<string, string>;
  private pendingWrites: Map<string, ReturnType<typeof setTimeout>>;
  private readonly DEBOUNCE_MS = 200; // Reduced to 200ms to minimize data loss on rapid close
  private errorListeners: Set<ErrorCallback> = new Set();

  constructor() {
    this.memory = new Map<string, string>();
    this.pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
    
    // Hydrate memory from disk on init
    if (typeof localStorage !== 'undefined') {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const rawVal = localStorage.getItem(key);
                    if (rawVal !== null) {
                        // Store raw for now, validation happens on getItem
                        this.memory.set(key, rawVal);
                    }
                }
            }
        } catch (e) {
            telemetry.log('WARN', 'Storage access failed on init', { error: String(e) });
        }
    }

    // Flush on unload
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => this.flushAll());
    }
  }

  // Simple DJB2 hash for checksum
  private generateChecksum(data: string): string {
      let hash = 5381;
      for (let i = 0; i < data.length; i++) {
          hash = ((hash << 5) + hash) + data.charCodeAt(i); /* hash * 33 + c */
      }
      return hash.toString(16);
  }

  subscribeToErrors(callback: ErrorCallback): () => void {
      this.errorListeners.add(callback);
      return () => this.errorListeners.delete(callback);
  }

  private emitError(payload: StorageErrorPayload) {
      this.errorListeners.forEach(cb => cb(payload));
  }

  // Raw getItem (internal use mostly, or for non-critical)
  getItem(key: string): string | null {
    return this.memory.get(key) || null;
  }

  // Typed get with Integrity Check
  getJson<T>(key: string): T | null {
      try {
          const raw = this.getItem(key);
          if (!raw) return null;
          
          let envelope: StorageEnvelope;
          try {
              envelope = JSON.parse(raw);
          } catch {
              // Legacy fallback: if not envelope, try parsing as raw T
              return JSON.parse(raw) as T;
          }
          
          // Legacy support (if no envelope structure yet)
          if (!envelope || typeof envelope !== 'object' || !envelope.hash) {
              return envelope as unknown as T;
          }

          // Verify Checksum
          const dataStr = JSON.stringify(envelope.data);
          const computedHash = this.generateChecksum(dataStr);
          
          if (computedHash !== envelope.hash) {
              throw new Error("Integrity check failed");
          }

          return envelope.data as T;

      } catch (e) {
          telemetry.log('ERROR', `Data Corruption detected for ${key}`, { error: String(e) });
          telemetry.incrementCounter('storage_corruption_total', 1, { key });
          
          this.emitError({
              type: 'CORRUPTION',
              message: 'Save data corrupted or tampered. Resetting to defaults.',
              key,
              originalError: e
          });

          // Don't auto-delete on parse error immediately, return null to let app decide,
          // but memory is already tainted so removeItem is safer to prevent loops.
          this.removeItem(key);
          return null;
      }
  }

  setItem(key: string, value: string): void {
      let dataToHash = value;
      let rawData = value;

      try {
          // If value is a stringified JSON object, we want to store it in the envelope as an object
          // so JSON.stringify(envelope) is valid.
          // However, Zustand persist middleware sends a string.
          // We need to parse it to put it into 'data' so we can hash the structure.
          const parsed = JSON.parse(value);
          dataToHash = JSON.stringify(parsed);
          rawData = parsed;
      } catch (e) {
          // It's a simple string
          dataToHash = value;
      }

      const hash = this.generateChecksum(dataToHash);
      const envelope: StorageEnvelope = {
          data: rawData, 
          hash: hash
      };
      
      const envelopeString = JSON.stringify(envelope);

      // 1. Update in-memory
      this.memory.set(key, envelopeString);

      // 2. Debounce Write
      if (this.pendingWrites.has(key)) {
          clearTimeout(this.pendingWrites.get(key));
      }

      const timeoutId = setTimeout(() => {
          this.persistToDisk(key, envelopeString);
          this.pendingWrites.delete(key);
      }, this.DEBOUNCE_MS);

      this.pendingWrites.set(key, timeoutId);
  }

  // Legacy accessor for raw string (mostly used by Zustand middleware internally)
  // We need to unwrap the envelope for Zustand to read it correctly
  getItemAndUnwrap(key: string): string | null {
      const raw = this.memory.get(key);
      if (!raw) return null;
      
      try {
          const envelope: StorageEnvelope = JSON.parse(raw);
          if (envelope && envelope.hash && envelope.data !== undefined) {
              const computed = this.generateChecksum(JSON.stringify(envelope.data));
              if (computed !== envelope.hash) {
                  telemetry.log('WARN', `Hash mismatch for ${key}`, { computed, stored: envelope.hash });
                  return null;
              }
              // Zustand expects the stringified state
              return JSON.stringify(envelope.data);
          }
          return raw;
      } catch(e) {
          return raw;
      }
  }

  removeItem(key: string): void {
    this.memory.delete(key);
    if (this.pendingWrites.has(key)) {
        clearTimeout(this.pendingWrites.get(key));
        this.pendingWrites.delete(key);
    }
    try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch (e) {
        telemetry.log('WARN', `Storage Delete Error`, { key, error: String(e) });
    }
  }

  clear(): void {
    this.memory.clear();
    this.flushAll(); 
    this.pendingWrites.forEach((timeoutId) => clearTimeout(timeoutId));
    this.pendingWrites.clear();
    
    try {
        if (typeof localStorage !== 'undefined') localStorage.clear();
    } catch (e) {
        telemetry.log('WARN', 'Storage Clear Error', { error: String(e) });
    }
  }

  private persistToDisk(key: string, value: string) {
      try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      } catch (e: any) {
          let type: StorageErrorType = 'UNKNOWN';
          let message = 'Failed to save progress.';

          if (e.name === 'QuotaExceededError' || e.code === 22) {
              type = 'QUOTA';
              message = 'Storage Full! Progress may not be saved.';
              telemetry.incrementCounter('storage_quota_exceeded', 1);
          } else if (e.name === 'SecurityError') {
              type = 'SECURITY';
              message = 'Private Browsing detected. Data will not persist.';
          }

          telemetry.log('ERROR', 'Persist to Disk Failed', { type, key, error: e.name });
          this.emitError({ type, message, key, originalError: e });
      }
  }

  public flushAll() {
      this.pendingWrites.forEach((timeoutId, key) => {
          clearTimeout(timeoutId);
          const val = this.memory.get(key);
          if (val) this.persistToDisk(key, val);
      });
      this.pendingWrites.clear();
  }
}

const rawStorage = new DebouncedStorage();

export const safeStorage = {
    getItem: (name: string): string | null => {
        return rawStorage.getItemAndUnwrap(name);
    },
    setItem: (name: string, value: string): void => {
        rawStorage.setItem(name, value);
    },
    removeItem: (name: string): void => {
        rawStorage.removeItem(name);
    },
    getJson: <T>(key: string) => rawStorage.getJson<T>(key),
    subscribeToErrors: (cb: ErrorCallback) => rawStorage.subscribeToErrors(cb),
    clear: () => rawStorage.clear(),
    flush: () => rawStorage.flushAll()
};
