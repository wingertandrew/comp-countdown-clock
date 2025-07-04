
import { useCallback } from 'react';
import { useDebugLog } from './useDebugLog';
import { ClockState } from '@/types/clock';

interface UseClockControlsProps {
  clockState: ClockState;
  initialTime: { minutes: number; seconds: number };
  setClockState: React.Dispatch<React.SetStateAction<ClockState>>;
  setInitialTime: React.Dispatch<React.SetStateAction<{ minutes: number; seconds: number }>>;
  resetSession: () => void;
}

export const useClockControls = ({
  clockState,
  initialTime,
  setClockState,
  setInitialTime,
  resetSession
}: UseClockControlsProps) => {
  const { addDebugLog } = useDebugLog();

  const startTimer = useCallback(async () => {
    try {
      const response = await fetch('/api/start', { method: 'POST' });
      if (response.ok) {
        addDebugLog('UI', 'Timer started via API');
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to start timer', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [addDebugLog]);

  const pauseTimer = useCallback(async () => {
    try {
      const response = await fetch('/api/pause', { method: 'POST' });
      if (response.ok) {
        addDebugLog('UI', 'Timer paused/resumed via API');
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to pause/resume timer', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [addDebugLog]);

  const togglePlayPause = useCallback(() => {
    if (!clockState.isRunning || clockState.isPaused) {
      startTimer();
    } else {
      pauseTimer();
    }
  }, [clockState.isRunning, clockState.isPaused, startTimer, pauseTimer]);

  const resetTime = useCallback(async () => {
    try {
      const response = await fetch('/api/reset-time', { method: 'POST' });
      if (response.ok) {
        addDebugLog('UI', 'Time reset via API');
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to reset time', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [addDebugLog]);

  const resetRounds = useCallback(async () => {
    try {
      const response = await fetch('/api/reset-rounds', { method: 'POST' });
      if (response.ok) {
        addDebugLog('UI', 'Rounds reset via API');
        resetSession();
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to reset rounds', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [addDebugLog, resetSession]);

  const nextRound = useCallback(async () => {
    if (clockState.currentRound < clockState.totalRounds) {
      try {
        const response = await fetch('/api/next-round', { method: 'POST' });
        if (response.ok) {
          addDebugLog('UI', 'Next round via API', {
            round: clockState.currentRound + 1
          });
        }
      } catch (error) {
        addDebugLog('UI', 'Failed to advance round', { error: error instanceof Error ? error.message : String(error) });
      }

      const newRound = clockState.currentRound + 1;
      setClockState(prev => ({
        ...prev,
        currentRound: newRound,
        minutes: initialTime.minutes,
        seconds: initialTime.seconds,
        isRunning: false,
        isPaused: false,
        elapsedMinutes: 0,
        elapsedSeconds: 0,
        isBetweenRounds: false
      }));
    }
  }, [clockState.currentRound, clockState.totalRounds, initialTime, setClockState, addDebugLog]);

  const previousRound = useCallback(() => {
    if (clockState.currentRound > 1) {
      const newRound = clockState.currentRound - 1;
      setClockState(prev => ({
        ...prev,
        currentRound: newRound,
        minutes: initialTime.minutes,
        seconds: initialTime.seconds,
        isRunning: false,
        isPaused: false,
        elapsedMinutes: 0,
        elapsedSeconds: 0,
        isBetweenRounds: false
      }));
      addDebugLog('UI', 'Previous round', { round: newRound });
    }
  }, [clockState.currentRound, initialTime, setClockState, addDebugLog]);

  const adjustTimeBySeconds = useCallback(async (secondsToAdd: number) => {
    if (clockState.isRunning && !clockState.isPaused) return;
    if (clockState.isBetweenRounds) return;
    
    try {
      const response = await fetch('/api/adjust-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: secondsToAdd })
      });
      
      if (response.ok) {
        addDebugLog('UI', 'Time adjusted via API', { adjustment: secondsToAdd });
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to adjust time', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [clockState.isRunning, clockState.isPaused, clockState.isBetweenRounds, addDebugLog]);

  const setTime = useCallback(async (minutes: number, seconds: number) => {
    const validMinutes = Math.max(0, Math.min(59, minutes));
    const validSeconds = Math.max(0, Math.min(59, seconds));
    
    try {
      const response = await fetch('/api/set-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: validMinutes, seconds: validSeconds })
      });
      
      if (response.ok) {
        setInitialTime({ minutes: validMinutes, seconds: validSeconds });
        setClockState(prev => ({
          ...prev,
          minutes: validMinutes,
          seconds: validSeconds
        }));
        addDebugLog('UI', 'Time set via API', { minutes: validMinutes, seconds: validSeconds });
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to set time', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [setInitialTime, setClockState, addDebugLog]);

  const setRounds = useCallback(async (rounds: number) => {
    const validRounds = Math.max(1, Math.min(15, rounds));
    
    try {
      const response = await fetch('/api/set-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds: validRounds })
      });
      
      if (response.ok) {
        addDebugLog('UI', 'Rounds set via API', { rounds: validRounds });
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to set rounds', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [addDebugLog]);

  return {
    togglePlayPause,
    resetTime,
    resetRounds,
    nextRound,
    previousRound,
    adjustTimeBySeconds,
    setTime,
    setRounds
  };
};
