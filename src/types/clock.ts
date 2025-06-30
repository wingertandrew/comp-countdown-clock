
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
}

export interface DebugLogEntry {
  timestamp: string;
  source: 'UI' | 'API' | 'WEBSOCKET';
  action: string;
  details?: any;
}

export type DebugFilter = 'ALL' | 'UI' | 'API' | 'WEBSOCKET';
