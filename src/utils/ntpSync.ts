
interface NTPResponse {
  offset: number;
  delay: number;
  timestamp: number;
}

interface NTPSyncConfig {
  servers: string[];
  syncInterval: number; // in milliseconds
  driftThreshold: number; // in milliseconds
  maxRetries: number;
}

export class NTPSyncManager {
  private config: NTPSyncConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private timeOffset: number = 0;
  private onSyncUpdate?: (data: { offset: number; timestamp: number; server: string }) => void;
  private onSyncError?: (error: string) => void;

  constructor(config: NTPSyncConfig) {
    this.config = config;
  }

  setCallbacks(onSyncUpdate?: (data: any) => void, onSyncError?: (error: string) => void) {
    this.onSyncUpdate = onSyncUpdate;
    this.onSyncError = onSyncError;
  }

  async syncWithNTP(server: string): Promise<NTPResponse> {
    try {
      // Simple NTP implementation using HTTP-based time API as fallback
      // In a real implementation, you'd use proper NTP protocol
      const response = await fetch(`https://worldtimeapi.org/api/timezone/Etc/UTC`);
      const data = await response.json();
      
      const serverTime = new Date(data.utc_datetime).getTime();
      const localTime = Date.now();
      const offset = serverTime - localTime;
      
      return {
        offset,
        delay: 0, // Would calculate RTT in real NTP
        timestamp: localTime
      };
    } catch (error) {
      throw new Error(`NTP sync failed for ${server}: ${error.message}`);
    }
  }

  async performSync(): Promise<void> {
    for (const server of this.config.servers) {
      try {
        const result = await this.syncWithNTP(server);
        
        // Apply smooth correction if drift exceeds threshold
        if (Math.abs(result.offset) > this.config.driftThreshold) {
          this.timeOffset = result.offset;
          this.onSyncUpdate?.({
            offset: result.offset,
            timestamp: result.timestamp,
            server
          });
        }
        
        this.lastSyncTime = Date.now();
        return; // Success, exit loop
      } catch (error) {
        console.warn(`NTP sync failed for ${server}:`, error);
        continue; // Try next server
      }
    }
    
    // All servers failed
    this.onSyncError?.('All NTP servers failed to respond');
  }

  startSync(): void {
    if (this.syncInterval) {
      this.stopSync();
    }
    
    // Initial sync
    this.performSync();
    
    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.config.syncInterval);
  }

  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  getSyncedTime(): number {
    return Date.now() + this.timeOffset;
  }

  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  getTimeOffset(): number {
    return this.timeOffset;
  }

  isHealthy(): boolean {
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    return timeSinceLastSync < this.config.syncInterval * 2; // Allow 2x interval before considering unhealthy
  }
}

// Default configuration
export const DEFAULT_NTP_CONFIG: NTPSyncConfig = {
  servers: [
    'pool.ntp.org',
    '0.pool.ntp.org', 
    '1.pool.ntp.org',
    '2.pool.ntp.org'
  ],
  syncInterval: 30000, // 30 seconds
  driftThreshold: 50, // 50ms
  maxRetries: 3
};
