import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Clock } from 'lucide-react';
import HoldButton from './HoldButton';
import FastAdjustButton from './FastAdjustButton';
import { ClockState, NTPSyncStatus } from '@/types/clock';

interface ClockDisplayProps {
  clockState: ClockState;
  ipAddress: string;
  betweenRoundsEnabled: boolean;
  betweenRoundsTime: number;
  ntpSyncStatus: NTPSyncStatus;
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
  ntpSyncStatus,
  onTogglePlayPause,
  onNextRound,
  onPreviousRound,
  onResetTime,
  onResetRounds,
  onAdjustTimeBySeconds
}) => {
  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatElapsedTime = (minutes: number, seconds: number) => {
    const totalSeconds = minutes * 60 + seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (clockState.isBetweenRounds) return 'text-blue-400';
    if (clockState.isRunning && !clockState.isPaused) return 'text-green-400';
    if (clockState.isPaused) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (clockState.isBetweenRounds) return 'Between Rounds';
    if (clockState.isRunning && !clockState.isPaused) return 'Running';
    if (clockState.isPaused) return 'Paused';
    return 'Stopped';
  };

  const canAdjustTime = !clockState.isRunning || clockState.isPaused;
  const isTimerActive = clockState.isRunning || clockState.isPaused;

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center justify-center space-y-8">
      <div className="text-center">
        <div className="text-2xl text-gray-400 mb-2">Timer Clock - {ipAddress}</div>
        <div className={`text-xl ${getStatusColor()}`}>
          {getStatusText()}
          {ntpSyncStatus.enabled && (
            <span className={`ml-2 text-sm ${ntpSyncStatus.healthy ? 'text-green-400' : 'text-red-400'}`}>
              (NTP {ntpSyncStatus.healthy ? 'SYNC' : 'ERROR'})
            </span>
          )}
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-700 w-full max-w-4xl">
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-8">
            <div className="text-center">
              <div className="text-9xl font-bold font-mono tracking-wider">
                {clockState.isBetweenRounds 
                  ? formatTime(clockState.betweenRoundsMinutes, clockState.betweenRoundsSeconds)
                  : formatTime(clockState.minutes, clockState.seconds)
                }
              </div>
              
              <div className="text-2xl text-gray-400 mt-4">
                Elapsed: {formatElapsedTime(clockState.elapsedMinutes, clockState.elapsedSeconds)}
                {clockState.isPaused && clockState.currentPauseDuration > 0 && (
                  <span className="text-yellow-400 ml-4">
                    (Paused: {Math.floor(clockState.currentPauseDuration / 60)}:{(clockState.currentPauseDuration % 60).toString().padStart(2, '0')})
                  </span>
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold">
                Round {clockState.currentRound} of {clockState.totalRounds}
              </div>
              {clockState.isBetweenRounds && (
                <div className="text-xl text-blue-400 mt-2">
                  Break Time ({betweenRoundsTime}s)
                </div>
              )}
            </div>

            <div className="flex gap-8">
              <Button
                onClick={onTogglePlayPause}
                size="lg"
                className="h-24 w-24 text-4xl bg-gray-700 hover:bg-gray-600 rounded-full"
                disabled={clockState.isBetweenRounds}
              >
                {clockState.isRunning && !clockState.isPaused ? 
                  <Pause className="w-12 h-12" /> : 
                  <Play className="w-12 h-12" />
                }
              </Button>

              <HoldButton
                onHoldComplete={onNextRound}
                className="h-24 w-24 text-4xl bg-gray-700 hover:bg-gray-600 rounded-full"
                disabled={clockState.currentRound >= clockState.totalRounds || clockState.isBetweenRounds}
              >
                <SkipForward className="w-12 h-12" />
              </HoldButton>

              <HoldButton
                onHoldComplete={onPreviousRound}
                className="h-24 w-24 text-4xl bg-gray-700 hover:bg-gray-600 rounded-full"
                disabled={clockState.currentRound <= 1 || clockState.isBetweenRounds}
              >
                <SkipBack className="w-12 h-12" />
              </HoldButton>

              <HoldButton
                onHoldComplete={onResetTime}
                className="h-24 w-24 text-4xl bg-gray-700 hover:bg-gray-600 rounded-full"
                disabled={isTimerActive || clockState.isBetweenRounds}
              >
                <Clock className="w-12 h-12" />
              </HoldButton>

              <HoldButton
                onHoldComplete={onResetRounds}
                className="h-24 w-24 text-4xl bg-gray-700 hover:bg-gray-600 rounded-full"
                disabled={clockState.isBetweenRounds}
              >
                <RotateCcw className="w-12 h-12" />
              </HoldButton>
            </div>

            <div className="flex gap-4">
              <FastAdjustButton
                onAdjust={(amount) => onAdjustTimeBySeconds(amount)}
                adjustAmount={-60}
                className="h-16 w-20 text-2xl bg-red-600 hover:bg-red-500 text-white rounded-xl"
                disabled={!canAdjustTime || clockState.isBetweenRounds}
              >
                -60s
              </FastAdjustButton>
              
              <FastAdjustButton
                onAdjust={(amount) => onAdjustTimeBySeconds(amount)}
                adjustAmount={-10}
                className="h-16 w-20 text-2xl bg-red-600 hover:bg-red-500 text-white rounded-xl"
                disabled={!canAdjustTime || clockState.isBetweenRounds}
              >
                -10s
              </FastAdjustButton>
              
              <FastAdjustButton
                onAdjust={(amount) => onAdjustTimeBySeconds(amount)}
                adjustAmount={-1}
                className="h-16 w-20 text-2xl bg-red-600 hover:bg-red-500 text-white rounded-xl"
                disabled={!canAdjustTime || clockState.isBetweenRounds}
              >
                -1s
              </FastAdjustButton>
              
              <FastAdjustButton
                onAdjust={(amount) => onAdjustTimeBySeconds(amount)}
                adjustAmount={1}
                className="h-16 w-20 text-2xl bg-green-600 hover:bg-green-500 text-white rounded-xl"
                disabled={!canAdjustTime || clockState.isBetweenRounds}
              >
                +1s
              </FastAdjustButton>
              
              <FastAdjustButton
                onAdjust={(amount) => onAdjustTimeBySeconds(amount)}
                adjustAmount={10}
                className="h-16 w-20 text-2xl bg-green-600 hover:bg-green-500 text-white rounded-xl"
                disabled={!canAdjustTime || clockState.isBetweenRounds}
              >
                +10s
              </FastAdjustButton>
              
              <FastAdjustButton
                onAdjust={(amount) => onAdjustTimeBySeconds(amount)}
                adjustAmount={60}
                className="h-16 w-20 text-2xl bg-green-600 hover:bg-green-500 text-white rounded-xl"
                disabled={!canAdjustTime || clockState.isBetweenRounds}
              >
                +60s
              </FastAdjustButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClockDisplay;
