
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

export interface NTPSyncStatus {
  enabled: boolean;
  lastSync: number;
  timeOffset: number;
  healthy: boolean;
  syncCount: number;
  errorCount: number;
}

export interface NTPSyncRecord {
  id: string;
  timestamp: number;
  server: string;
  offset: number;
  success: boolean;
  error?: string;
}

export interface SessionEvent {
  id: string;
  timestamp: number;
  type: 'start' | 'pause' | 'resume' | 'round_start' | 'round_end' | 'between_rounds_start' | 'between_rounds_end' | 'reset';
  round: number;
  data?: any;
}

export interface RoundSummary {
  round: number;
  startTime: number;
  endTime: number;
  runTime: number;
  pauseTime: number;
  betweenRoundsTime: number;
  totalTime: number;
  events: SessionEvent[];
  anomalies: string[];
}

export interface SessionReport {
  sessionId: string;
  startTime: number;
  endTime: number;
  expectedTotalTime: number;
  actualTotalTime: number;
  totalRunTime: number;
  totalPauseTime: number;
  totalBetweenRoundsTime: number;
  rounds: RoundSummary[];
  anomalies: string[];
  isValid: boolean;
  validationStatus: 'complete' | 'incomplete' | 'with_anomalies';
}
