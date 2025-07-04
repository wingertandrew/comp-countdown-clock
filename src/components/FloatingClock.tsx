
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
    <div className="sticky top-0 z-40 w-full">
      <div 
        className="bg-black border-b-2 px-4 py-2 shadow-lg"
        style={{ borderBottomColor: statusColor }}
      >
        <div className="flex items-center justify-between max-w-full">
          {/* Timer Display */}
          <div className="flex items-center space-x-4">
            <div className="text-xl font-bold font-mono text-white">
              {displayTime}
            </div>
            
            {/* Status */}
            <div 
              className="rounded px-3 py-1 text-xs font-bold text-black"
              style={{ backgroundColor: statusColor }}
            >
              {clockState.isBetweenRounds ? 'BETWEEN ROUNDS' : getStatusText(clockState.isRunning, clockState.isPaused, clockState.isBetweenRounds)}
            </div>
          </div>

          {/* Round Info and Details */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-white font-bold">
              ROUND {clockState.currentRound} of {clockState.totalRounds}
            </div>
            
            <div className="text-gray-300 text-xs">
              {clockState.isBetweenRounds 
                ? `Between: ${displayTime}` 
                : `Elapsed: ${formatTime(clockState.elapsedMinutes, clockState.elapsedSeconds)}`
              }
            </div>

            {/* NTP Status */}
            {ntpSyncStatus.enabled && (
              <div className="text-xs">
                <span className={ntpSyncStatus.healthy ? 'text-green-400' : 'text-red-400'}>
                  NTP {ntpSyncStatus.healthy ? 'SYNC' : 'FAIL'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingClock;
