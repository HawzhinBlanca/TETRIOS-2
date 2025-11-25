
// Reliability Utility: Safe Storage Wrapper
// Handles SecurityError (Private Browsing), QuotaExceededError, and access restrictions.
// Includes Debouncing to prevent Main Thread Blocking on high-frequency updates (e.g. sliders).

export type StorageErrorType = 'QUOTA' | 'SECURITY' | 'CORRUPTION' | 'UNKNOWN';

export interface StorageErrorPayload {
    type: StorageErrorType;
    message: string;
    key?: string;
    originalError?: any;
}

type ErrorCallback = (error: StorageErrorPayload) => void;

class DebouncedStorage {
  private memory: Map<string, string>;
  private pendingWrites: Map<string, ReturnType<typeof setTimeout>>;
  private readonly DEBOUNCE_MS = 1000;
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
                    const val = localStorage.getItem(key);
                    if (val !== null) this.memory.set(key, val);
                }
            }
        } catch (e) {
            console.warn("[Reliability] Storage access failed on init (likely Privacy Mode):", e);
            // We don't emit here to avoid spamming on startup, silent fallback to memory is preferred for Privacy Mode
        }
    }

    // Flush on unload
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => this.flushAll());
    }
  }

  subscribeToErrors(callback: ErrorCallback): () => void {
      this.errorListeners.add(callback);
      return () => this.errorListeners.delete(callback);
  }

  private emitError(payload: StorageErrorPayload) {
      this.errorListeners.forEach(cb => cb(payload));
  }

  getItem(key: string): string | null {
    return this.memory.get(key) || null;
  }

  setItem(key: string, value: string): void {
    // 1. Update in-memory immediately (UI feels instant)
    this.memory.set(key, value);

    // 2. Clear existing pending write for this key
    if (this.pendingWrites.has(key)) {
        clearTimeout(this.pendingWrites.get(key));
    }

    // 3. Schedule write to disk
    const timeoutId = setTimeout(() => {
        this.persistToDisk(key, value);
        this.pendingWrites.delete(key);
    }, this.DEBOUNCE_MS);

    this.pendingWrites.set(key, timeoutId);
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
        console.warn(`[Reliability] Storage Delete Error (${key}):`, e);
    }
  }

  clear(): void {
    this.memory.clear();
    this.flushAll(); // Ensure pending are cleared
    this.pendingWrites.forEach((timeoutId) => clearTimeout(timeoutId));
    this.pendingWrites.clear();
    
    try {
        if (typeof localStorage !== 'undefined') localStorage.clear();
    } catch (e) {
        console.warn("[Reliability] Storage Clear Error:", e);
    }
  }

  getJson<T>(key: string): T | null {
      try {
          const raw = this.getItem(key);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return parsed as T;
      } catch (e) {
          console.error(`[Reliability] Data Corruption for "${key}". Auto-cleaning to prevent crash.`, e);
          
          // Notify User
          this.emitError({
              type: 'CORRUPTION',
              message: 'Save data corrupted. Resetting to defaults.',
              key,
              originalError: e
          });

          // If data is corrupt, remove it so we revert to defaults on next load
          this.removeItem(key);
          return null;
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
              console.error("[Reliability] Storage Quota Exceeded.");
          } else if (e.name === 'SecurityError') {
              type = 'SECURITY';
              message = 'Private Browsing detected. Data will not persist.';
              console.warn("[Reliability] Storage Security Error.");
          } else {
              console.warn(`[Reliability] Storage Write Error (${key}):`, e);
          }

          this.emitError({ type, message, key, originalError: e });
      }
  }

  private flushAll() {
      this.pendingWrites.forEach((timeoutId, key) => {
          clearTimeout(timeoutId);
          const val = this.memory.get(key);
          if (val) this.persistToDisk(key, val);
      });
      this.pendingWrites.clear();
  }
}

export const safeStorage = new DebouncedStorage();
