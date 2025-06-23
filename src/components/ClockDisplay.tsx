
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, SkipBack, Plus, Minus } from 'lucide-react';
import { ClockState } from '@/types/clock';
import { formatTime, formatDuration, getStatusColor, getStatusText } from '@/utils/clockUtils';

interface ClockDisplayProps {
  clockState: ClockState;
  ipAddress: string;
  onTogglePlayPause: () => void;
  onNextRound: () => void;
  onPreviousRound: () => void;
  onResetTimer: () => void;
  onAdjustTimeBySeconds: (seconds: number) => void;
}

const ClockDisplay: React.FC<ClockDisplayProps> = ({
  clockState,
  ipAddress,
  onTogglePlayPause,
  onNextRound,
  onPreviousRound,
  onResetTimer,
  onAdjustTimeBySeconds
}) => {
  const statusColor = getStatusColor(clockState.isRunning, clockState.isPaused);

  return (
    <div className={`bg-black rounded-3xl p-8 border-4 border-${statusColor}-500 relative overflow-hidden`}>
      {/* Elapsed Time Header */}
      <div className={`absolute top-0 left-0 right-0 bg-${statusColor}-500 p-4`}>
        <div className="flex items-center justify-center gap-4 text-black text-2xl font-bold">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
            <div className={`w-4 h-4 bg-${statusColor}-500 rounded-full`}></div>
          </div>
          <span>ELAPSED: {formatTime(clockState.elapsedMinutes, clockState.elapsedSeconds)}</span>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="mt-20 mb-8">
        <div className="text-center">
          <div className="text-[16rem] md:text-[24rem] lg:text-[28rem] xl:text-[32rem] font-bold tracking-wider text-white leading-none font-mono">
            {formatTime(clockState.minutes, clockState.seconds)}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`bg-${statusColor}-500 rounded-xl p-8 mb-6`}>
        <div className="flex items-center justify-center gap-4 text-black text-4xl font-bold">
          <div className="flex items-center gap-3">
            {clockState.isRunning && !clockState.isPaused ? (
              <div className="w-0 h-0 border-l-[20px] border-l-black border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent"></div>
            ) : clockState.isPaused ? (
              <div className="flex gap-2">
                <div className="w-3 h-8 bg-black"></div>
                <div className="w-3 h-8 bg-black"></div>
              </div>
            ) : (
              <div className="w-8 h-8 bg-black"></div>
            )}
            <span>{getStatusText(clockState.isRunning, clockState.isPaused)}</span>
          </div>
          {clockState.isPaused && (
            <span className="text-orange-600">
              - {formatDuration(clockState.currentPauseDuration)}
            </span>
          )}
        </div>
      </div>

      {/* IP Address */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-white text-xl">
          <div className="w-4 h-4 bg-white rounded-full"></div>
          <span>{ipAddress}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-7 gap-4">
        {/* Time Adjustment Group */}
        <div className="col-span-2 flex gap-2">
          <Button
            onClick={() => onAdjustTimeBySeconds(-1)}
            disabled={clockState.isRunning}
            className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl text-3xl font-bold flex-1"
          >
            <Minus className="w-8 h-8" />
          </Button>
          <Button
            onClick={() => onAdjustTimeBySeconds(1)}
            disabled={clockState.isRunning}
            className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl text-3xl font-bold flex-1"
          >
            <Plus className="w-8 h-8" />
          </Button>
        </div>

        {/* Round Controls */}
        <Button
          onClick={onPreviousRound}
          disabled={clockState.currentRound <= 1}
          className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl"
        >
          <SkipBack className="w-10 h-10" />
        </Button>

        {/* Play/Pause Button - Wider */}
        <Button
          onClick={onTogglePlayPause}
          className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl col-span-2"
        >
          {clockState.isRunning && !clockState.isPaused ? (
            <div className="flex gap-2">
              <div className="w-4 h-12 bg-black"></div>
              <div className="w-4 h-12 bg-black"></div>
            </div>
          ) : (
            <div className="w-0 h-0 border-l-[24px] border-l-black border-t-[18px] border-t-transparent border-b-[18px] border-b-transparent ml-2"></div>
          )}
        </Button>

        <Button
          onClick={onNextRound}
          disabled={clockState.currentRound >= clockState.totalRounds}
          className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl"
        >
          <SkipForward className="w-10 h-10" />
        </Button>

        {/* Reset Button - Smaller */}
        <Button
          onClick={onResetTimer}
          className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl"
        >
          <div className="w-6 h-6 bg-black rounded-sm"></div>
        </Button>
      </div>

      {/* Round Info */}
      <div className="text-center mt-8 text-white text-2xl">
        Round {clockState.currentRound} of {clockState.totalRounds}
        {clockState.totalPausedTime > 0 && (
          <div className="text-yellow-400 text-xl mt-2">
            Total Paused: {formatDuration(clockState.totalPausedTime)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClockDisplay;
