
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, SkipBack, Plus, Minus, RotateCcw, History } from 'lucide-react';
import HoldButton from './HoldButton';
import { ClockState } from '@/types/clock';
import { formatTime, formatDuration, getStatusColor, getStatusText } from '@/utils/clockUtils';

interface ClockDisplayProps {
  clockState: ClockState;
  ipAddress: string;
  betweenRoundsEnabled: boolean;
  betweenRoundsTime: number;
  onTogglePlayPause: () => void;
  onNextRound: () => void;
  onPreviousRound: () => void;
  onResetTime: () => void;
  onResetRounds: () => void;
  onAdjustTimeBySeconds: (seconds: number) => void;
}

const ClockDisplay: React.FC<ClockDisplayProps> = ({
  clockState,
  ipAddress,
  betweenRoundsEnabled,
  betweenRoundsTime,
  onTogglePlayPause,
  onNextRound,
  onPreviousRound,
  onResetTime,
  onResetRounds,
  onAdjustTimeBySeconds
}) => {
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
    <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6 lg:p-8">
      <div
        className="bg-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border-2 sm:border-4 relative overflow-hidden max-w-7xl mx-auto"
        style={{ borderColor: statusColor }}
      >
        {/* Elapsed Time Header */}
        <div
          className="absolute top-0 left-0 right-0 p-2 sm:p-3 md:p-4"
          style={{ backgroundColor: statusColor }}
        >
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 text-black text-sm sm:text-lg md:text-xl lg:text-2xl font-bold">
            <div className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full bg-black flex items-center justify-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full" style={{ backgroundColor: statusColor }}></div>
            </div>
            <span>
              {clockState.isBetweenRounds ? 'BETWEEN ROUNDS: ' : 'ELAPSED: '}
              {clockState.isBetweenRounds 
                ? displayTime 
                : formatTime(clockState.elapsedMinutes, clockState.elapsedSeconds)
              }
            </span>
          </div>
        </div>

        {/* Main Timer Display - Responsive sizing */}
        <div className="mt-12 sm:mt-16 md:mt-20 mb-4 sm:mb-6 md:mb-8">
          <div className="text-center">
            <div className="text-6xl sm:text-8xl md:text-[12rem] lg:text-[16rem] xl:text-[20rem] 2xl:text-[24rem] font-bold tracking-wider text-white leading-none font-mono">
              {displayTime}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6" style={{ backgroundColor: statusColor }}>
          <div className="flex flex-col items-center gap-2 sm:gap-3 text-black">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold">
              <div className="flex items-center gap-2 sm:gap-3">
                {clockState.isRunning && !clockState.isPaused ? (
                  <div className="w-0 h-0 border-l-[12px] sm:border-l-[16px] md:border-l-[20px] border-l-black border-t-[8px] sm:border-t-[10px] md:border-t-[12px] border-t-transparent border-b-[8px] sm:border-b-[10px] md:border-b-[12px] border-b-transparent"></div>
                ) : clockState.isPaused ? (
                  <div className="flex gap-1 sm:gap-2">
                    <div className="w-2 sm:w-3 h-4 sm:h-6 md:h-8 bg-black"></div>
                    <div className="w-2 sm:w-3 h-4 sm:h-6 md:h-8 bg-black"></div>
                  </div>
                ) : (
                  <div className="w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8 bg-black"></div>
                )}
                <span>{getStatusText(clockState.isRunning, clockState.isPaused, clockState.isBetweenRounds)}</span>
              </div>
            </div>
            {clockState.isPaused && (
              <div className="bg-black/20 rounded-full px-3 py-1 text-sm sm:text-base md:text-lg font-mono">
                {formatDuration(clockState.currentPauseDuration)}
              </div>
            )}
          </div>
        </div>

        {/* IP Address */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 text-white text-sm sm:text-lg md:text-xl">
            <div className="w-2 sm:w-3 md:w-4 h-2 sm:h-3 md:h-4 bg-white rounded-full"></div>
            <span>{ipAddress}</span>
          </div>
        </div>

        {/* Round Info */}
        <div className="text-center text-white mb-4 sm:mb-6 md:mb-8">
          <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold">
            ROUND {clockState.currentRound} of {clockState.totalRounds}
          </div>
        </div>

        {/* Control Buttons - Responsive grid */}
        <div className="grid grid-cols-8 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          {/* Time Adjustment Group - Disabled during between rounds */}
          <div className="col-span-2 flex gap-1 sm:gap-2">
            <Button
              onClick={() => onAdjustTimeBySeconds(-1)}
              disabled={(clockState.isRunning && !clockState.isPaused) || clockState.isBetweenRounds}
              className="h-12 sm:h-16 md:h-20 lg:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-xl sm:rounded-2xl text-lg sm:text-2xl md:text-3xl font-bold flex-1"
            >
              <Minus className="w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8" />
            </Button>
            <Button
              onClick={() => onAdjustTimeBySeconds(1)}
              disabled={(clockState.isRunning && !clockState.isPaused) || clockState.isBetweenRounds}
              className="h-12 sm:h-16 md:h-20 lg:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-xl sm:rounded-2xl text-lg sm:text-2xl md:text-3xl font-bold flex-1"
            >
              <Plus className="w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8" />
            </Button>
          </div>

          {/* Round Controls - Disabled during between rounds */}
          <Button
            onClick={onPreviousRound}
            disabled={clockState.currentRound <= 1 || clockState.isBetweenRounds}
            className="h-12 sm:h-16 md:h-20 lg:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-xl sm:rounded-2xl"
          >
            <SkipBack className="w-5 sm:w-7 md:w-9 lg:w-10 h-5 sm:h-7 md:h-9 lg:h-10" />
          </Button>

          {/* Play/Pause Button - Wider */}
          <Button
            onClick={onTogglePlayPause}
            className="h-12 sm:h-16 md:h-20 lg:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-xl sm:rounded-2xl col-span-2"
          >
            {clockState.isRunning && !clockState.isPaused ? (
              <div className="flex gap-1 sm:gap-2">
                <div className="w-2 sm:w-3 md:w-4 h-6 sm:h-8 md:h-10 lg:h-12 bg-black"></div>
                <div className="w-2 sm:w-3 md:w-4 h-6 sm:h-8 md:h-10 lg:h-12 bg-black"></div>
              </div>
            ) : (
              <div className="w-0 h-0 border-l-[12px] sm:border-l-[16px] md:border-l-[20px] lg:border-l-[24px] border-l-black border-t-[9px] sm:border-t-[12px] md:border-t-[15px] lg:border-t-[18px] border-t-transparent border-b-[9px] sm:border-b-[12px] md:border-b-[15px] lg:border-b-[18px] border-b-transparent ml-1 sm:ml-2"></div>
            )}
          </Button>

          <Button
            onClick={onNextRound}
            disabled={clockState.currentRound >= clockState.totalRounds || clockState.isBetweenRounds}
            className="h-12 sm:h-16 md:h-20 lg:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-xl sm:rounded-2xl"
          >
            <SkipForward className="w-5 sm:w-7 md:w-9 lg:w-10 h-5 sm:h-7 md:h-9 lg:h-10" />
          </Button>

          {/* Reset Time Button - Disabled during between rounds */}
          <HoldButton
            onHoldComplete={onResetTime}
            disabled={clockState.isBetweenRounds}
            className="h-12 sm:h-16 md:h-20 lg:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-xl sm:rounded-2xl"
          >
            <RotateCcw className="w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8" />
          </HoldButton>

          {/* Reset Rounds Button - Disabled during between rounds */}
          <HoldButton
            onHoldComplete={onResetRounds}
            disabled={clockState.isBetweenRounds}
            className="h-12 sm:h-16 md:h-20 lg:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-xl sm:rounded-2xl"
          >
            <History className="w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8" />
          </HoldButton>
        </div>

        {/* Stats - Left side */}
        <div className="flex items-start text-white">
          {/* Left side - Total Paused and Between Rounds info */}
          <div className="flex flex-col gap-1">
            {clockState.totalPausedTime > 0 && (
              <div className="text-yellow-400 text-lg sm:text-xl md:text-2xl">
                Total Paused: {formatDuration(clockState.totalPausedTime)}
              </div>
            )}
            {betweenRoundsEnabled && (
              <div className="text-purple-400 text-lg sm:text-xl md:text-2xl">
                Between Rounds Timer: {betweenRoundsTime}s
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockDisplay;
