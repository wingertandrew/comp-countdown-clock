
import { useState, useEffect, useRef } from 'react';
import { ClockState, SessionSegment, RoundStats, SessionReport } from '@/types/clock';

export const useSessionTracking = (clockState: ClockState) => {
  const [sessionReport, setSessionReport] = useState<SessionReport | null>(null);
  const [currentSegments, setCurrentSegments] = useState<SessionSegment[]>([]);
  const segmentStartTime = useRef<number>(Date.now());
  const sessionStartTime = useRef<number>(Date.now());
  const lastState = useRef<{
    isRunning: boolean;
    isPaused: boolean;
    isBetweenRounds: boolean;
    currentRound: number;
  }>({
    isRunning: false,
    isPaused: false,
    isBetweenRounds: false,
    currentRound: 1
  });

  // Track state changes and create segments
  useEffect(() => {
    const now = Date.now();
    const current = {
      isRunning: clockState.isRunning,
      isPaused: clockState.isPaused,
      isBetweenRounds: clockState.isBetweenRounds,
      currentRound: clockState.currentRound
    };

    // Check if state changed
    const stateChanged = (
      lastState.current.isRunning !== current.isRunning ||
      lastState.current.isPaused !== current.isPaused ||
      lastState.current.isBetweenRounds !== current.isBetweenRounds ||
      lastState.current.currentRound !== current.currentRound
    );

    if (stateChanged) {
      // End the previous segment
      const segmentType = lastState.current.isBetweenRounds ? 'between-rounds' :
                         lastState.current.isPaused ? 'pause' : 'run';
      
      if (segmentStartTime.current < now) {
        const segment: SessionSegment = {
          type: segmentType,
          startTime: segmentStartTime.current,
          endTime: now,
          duration: now - segmentStartTime.current,
          round: lastState.current.currentRound
        };

        setCurrentSegments(prev => [...prev, segment]);
      }

      // Start new segment
      segmentStartTime.current = now;
      lastState.current = current;
    }
  }, [clockState.isRunning, clockState.isPaused, clockState.isBetweenRounds, clockState.currentRound]);

  // Generate session report
  const generateReport = (): SessionReport => {
    const now = Date.now();
    
    // Close current segment
    const segmentType = clockState.isBetweenRounds ? 'between-rounds' :
                       clockState.isPaused ? 'pause' : 'run';
    
    const finalSegments = [...currentSegments];
    if (segmentStartTime.current < now) {
      finalSegments.push({
        type: segmentType,
        startTime: segmentStartTime.current,
        endTime: now,
        duration: now - segmentStartTime.current,
        round: clockState.currentRound
      });
    }

    // Calculate round stats
    const roundStats: RoundStats[] = [];
    for (let round = 1; round <= clockState.totalRounds; round++) {
      const roundSegments = finalSegments.filter(s => s.round === round);
      const runTime = roundSegments.filter(s => s.type === 'run').reduce((sum, s) => sum + s.duration, 0);
      const pauseTime = roundSegments.filter(s => s.type === 'pause').reduce((sum, s) => sum + s.duration, 0);
      const betweenTime = roundSegments.filter(s => s.type === 'between-rounds').reduce((sum, s) => sum + s.duration, 0);

      roundStats.push({
        round,
        runTime,
        pauseTime,
        betweenTime,
        totalTime: runTime + pauseTime + betweenTime,
        segments: roundSegments
      });
    }

    // Calculate totals
    const totalActualTime = finalSegments.reduce((sum, s) => sum + s.duration, 0);
    const totalPauseTime = finalSegments.filter(s => s.type === 'pause').reduce((sum, s) => sum + s.duration, 0);
    const totalBetweenTime = finalSegments.filter(s => s.type === 'between-rounds').reduce((sum, s) => sum + s.duration, 0);
    
    // Expected time calculation (initial time * rounds + between time * (rounds - 1))
    const initialTimeMs = (clockState.minutes * 60 + clockState.seconds) * 1000;
    const betweenRoundsMs = clockState.betweenRoundsEnabled ? clockState.betweenRoundsTime * 1000 : 0;
    const totalExpectedTime = (initialTimeMs * clockState.totalRounds) + (betweenRoundsMs * (clockState.totalRounds - 1));

    // Detect anomalies
    const anomalies: string[] = [];
    
    // Long pauses (> 5 minutes)
    const longPauses = finalSegments.filter(s => s.type === 'pause' && s.duration > 300000);
    if (longPauses.length > 0) {
      anomalies.push(`${longPauses.length} pause(s) longer than 5 minutes detected`);
    }

    // Short rounds (< 50% of expected time)
    const shortRounds = roundStats.filter(r => r.runTime < initialTimeMs * 0.5);
    if (shortRounds.length > 0) {
      anomalies.push(`${shortRounds.length} round(s) significantly shorter than expected`);
    }

    // Time drift (actual vs expected)
    const timeDrift = Math.abs(totalActualTime - totalExpectedTime);
    if (timeDrift > 60000) { // More than 1 minute drift
      anomalies.push(`Session time drift: ${Math.round(timeDrift / 1000)}s from expected`);
    }

    const report: SessionReport = {
      sessionId: `session_${sessionStartTime.current}`,
      startTime: sessionStartTime.current,
      endTime: now,
      totalExpectedTime,
      totalActualTime,
      totalPauseTime,
      totalBetweenTime,
      roundStats,
      anomalies
    };

    setSessionReport(report);
    return report;
  };

  const resetSession = () => {
    setCurrentSegments([]);
    setSessionReport(null);
    segmentStartTime.current = Date.now();
    sessionStartTime.current = Date.now();
    lastState.current = {
      isRunning: false,
      isPaused: false,
      isBetweenRounds: false,
      currentRound: 1
    };
  };

  return {
    sessionReport,
    currentSegments,
    generateReport,
    resetSession
  };
};
