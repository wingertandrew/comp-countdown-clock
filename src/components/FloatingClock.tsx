
import React from 'react';
import { ClockState, NTPSyncStatus } from '@/types/clock';
import { formatTime, getStatusColor, getStatusText } from '@/utils/clockUtils';

interface FloatingClockProps {
  clockState: ClockState;
  ntpSyncStatus: NTPSyncStatus;
}

const FloatingClock: React.FC<FloatingClockProps> = ({ clockState, ntpSyncStatus }) => {
  const statusColor = getStatusColor(
    clockState.isRunning, 
    clockState.isPaused, 
    clockState.minutes, 
    clockState.seconds, 
    clockState.isBetweenRounds
  );

  const displayTime = clockState.isBetweenRounds 
    ? formatTime(clockState.betweenRoundsMinutes, clockState.betweenRoundsSeconds)
    : formatTime(clockState.minutes, clockState.seconds);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className="bg-black rounded-lg p-3 border-2 shadow-lg min-w-[200px]"
        style={{ borderColor: statusColor }}
      >
        {/* Timer Display */}
        <div className="text-center mb-2">
          <div className="text-2xl font-bold font-mono text-white">
            {displayTime}
          </div>
        </div>

        {/* Status Bar */}
        <div 
          className="rounded p-2 mb-2 text-center text-sm font-bold text-black"
          style={{ backgroundColor: statusColor }}
        >
          {clockState.isBetweenRounds ? 'BETWEEN ROUNDS' : getStatusText(clockState.isRunning, clockState.isPaused, clockState.isBetweenRounds)}
        </div>

        {/* Round Info */}
        <div className="text-center text-white text-sm font-bold mb-1">
          ROUND {clockState.currentRound} of {clockState.totalRounds}
        </div>

        {/* Elapsed Time */}
        <div className="text-center text-gray-300 text-xs">
          {clockState.isBetweenRounds 
            ? `Between: ${displayTime}` 
            : `Elapsed: ${formatTime(clockState.elapsedMinutes, clockState.elapsedSeconds)}`
          }
        </div>

        {/* NTP Status */}
        {ntpSyncStatus.enabled && (
          <div className="text-center text-xs mt-1">
            <span className={ntpSyncStatus.healthy ? 'text-green-400' : 'text-red-400'}>
              NTP {ntpSyncStatus.healthy ? 'SYNC' : 'FAIL'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingClock;
