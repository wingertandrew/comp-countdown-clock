import dgram from 'dgram';
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
      return await this.queryUdpTime(server);
    } catch (error) {
      console.warn(`UDP NTP failed for ${server}:`, error);
      return await this.queryHttpTime();
    }
  }

  private queryUdpTime(server: string): Promise<NTPResponse> {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket('udp4');
      const packet = Buffer.alloc(48);
      packet[0] = 0x1b; // LI = 0, VN = 3, Mode = 3 (client)

      const now = Date.now();
      const ntpSec = Math.floor(now / 1000) + 2208988800;
      const ntpFrac = Math.floor(((now % 1000) / 1000) * 2 ** 32);
      packet.writeUInt32BE(ntpSec, 40);
      packet.writeUInt32BE(ntpFrac, 44);

      const timeout = setTimeout(() => {
        client.close();
        reject(new Error('NTP request timed out'));
      }, 10000);

      client.once('error', (err: Error) => {
        clearTimeout(timeout);
        client.close();
        reject(err);
      });

      const t1 = now;

      const toMillis = (sec: number, frac: number) => {
        const ms = (sec - 2208988800) * 1000;
        const fracMs = Math.round((frac / 2 ** 32) * 1000);
        return ms + fracMs;
      };

      client.once('message', (msg: Buffer) => {
        const t4 = Date.now();
        clearTimeout(timeout);
        client.close();

        const originateSec = msg.readUInt32BE(24);
        const originateFrac = msg.readUInt32BE(28);
        const receiveSec = msg.readUInt32BE(32);
        const receiveFrac = msg.readUInt32BE(36);
        const transmitSec = msg.readUInt32BE(40);
        const transmitFrac = msg.readUInt32BE(44);

        const T1 = toMillis(originateSec, originateFrac);
        const T2 = toMillis(receiveSec, receiveFrac);
        const T3 = toMillis(transmitSec, transmitFrac);
        const T4 = t4;

        const offset = ((T2 - T1) + (T3 - T4)) / 2;
        const delay = (T4 - T1) - (T3 - T2);

        resolve({ offset, delay, timestamp: T4 });
      });

      client.send(packet, 0, packet.length, 123, server, (err: Error | null) => {
        if (err) {
          clearTimeout(timeout);
          client.close();
          reject(err);
        }
      });
    });
  }

  private async queryHttpTime(): Promise<NTPResponse> {
    const before = Date.now();
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
    const data = await response.json();
    const after = Date.now();

    const serverTime = new Date(data.utc_datetime).getTime();
    const delay = after - before;
    const clientTime = before + delay / 2;
    const offset = serverTime - clientTime;

    return { offset, delay, timestamp: clientTime };
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
