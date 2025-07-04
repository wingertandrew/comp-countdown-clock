
export interface ClockState {
  minutes: number;
  seconds: number;
  currentRound: number;
  totalRounds: number;
  isRunning: boolean;
  isPaused: boolean;
  elapsedMinutes: number;
  elapsedSeconds: number;
  pauseStartTime: number | null;
  totalPausedTime: number;
  currentPauseDuration: number;
  isBetweenRounds: boolean;
  betweenRoundsMinutes: number;
  betweenRoundsSeconds: number;
  betweenRoundsEnabled: boolean;
  betweenRoundsTime: number;
  ntpSyncEnabled: boolean;
  ntpSyncInterval: number;
  ntpDriftThreshold: number;
  ntpOffset: number;
  masterClockStartTime?: number;
  ntpTimestamp?: number | null;
  serverTime?: number;
}

export interface DebugLogEntry {
  timestamp: string;
  source: 'UI' | 'API' | 'WEBSOCKET' | 'NTP';
  action: string;
  details?: any;
}

export type DebugFilter = 'ALL' | 'UI' | 'API' | 'WEBSOCKET' | 'NTP';

export interface NTPSyncEvent {
  timestamp: number;
  server: string;
  offset: number;
  success: boolean;
  error?: string;
}

export interface NTPSyncStatus {
  enabled: boolean;
  lastSync: number;
  timeOffset: number;
  healthy: boolean;
  syncCount: number;
  errorCount: number;
  syncHistory: NTPSyncEvent[];
}

export interface SessionSegment {
  type: 'run' | 'pause' | 'between-rounds';
  startTime: number;
  endTime: number;
  duration: number;
  round: number;
}

export interface RoundStats {
  round: number;
  runTime: number;
  pauseTime: number;
  betweenTime: number;
  totalTime: number;
  segments: SessionSegment[];
}

export interface SessionReport {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalExpectedTime: number;
  totalActualTime: number;
  totalPauseTime: number;
  totalBetweenTime: number;
  roundStats: RoundStats[];
  anomalies: string[];
}
