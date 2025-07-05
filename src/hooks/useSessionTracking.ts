
import { useState, useCallback, useRef, useEffect } from 'react';
import { SessionEvent, RoundSummary, SessionReport, ClockState } from '@/types/clock';

export const useSessionTracking = (clockState: ClockState) => {
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentReport, setCurrentReport] = useState<SessionReport | null>(null);
  const sessionIdRef = useRef<string>('');
  const lastStateRef = useRef<ClockState | null>(null);
  
  // Track actual clock times per round
  const roundTimesRef = useRef<Map<number, {
    runTime: number;
    pauseTime: number;
    betweenRoundsTime: number;
    startTime: number;
    endTime: number;
  }>>(new Map());

  // Generate session ID when session starts
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add event to session
  const addEvent = useCallback(
    (
      type: SessionEvent['type'],
      data?: any,
      roundOverride?: number
    ) => {
      const event: SessionEvent = {
        id: `${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: Date.now(),
        type,
        round: roundOverride ?? clockState.currentRound,
        data
      };
      setSessionEvents(prev => [...prev, event]);
    },
    [clockState.currentRound]
  );

  // Update round times based on current clock state
  useEffect(() => {
    if (sessionStartTime && clockState.isRunning) {
      const currentRound = clockState.currentRound;
      const currentRoundData = roundTimesRef.current.get(currentRound) || {
        runTime: 0,
        pauseTime: 0,
        betweenRoundsTime: 0,
        startTime: Date.now(),
        endTime: Date.now()
      };

      // Calculate actual run time from clock state (initial time - current time)
      const totalSecondsInRound = (clockState.minutes + clockState.seconds / 60) * 60;
      const currentSecondsInRound = clockState.minutes * 60 + clockState.seconds;
      const actualRunTime = totalSecondsInRound - currentSecondsInRound;

      // Use clock state for pause and between rounds times
      const pauseTime = clockState.totalPausedTime / 1000; // Convert from ms to seconds
      const betweenRoundsTime = clockState.isBetweenRounds ? 
        (clockState.betweenRoundsTime - (clockState.betweenRoundsMinutes * 60 + clockState.betweenRoundsSeconds)) : 0;

      roundTimesRef.current.set(currentRound, {
        ...currentRoundData,
        runTime: Math.max(0, actualRunTime),
        pauseTime: Math.max(0, pauseTime),
        betweenRoundsTime: Math.max(0, betweenRoundsTime),
        endTime: Date.now()
      });
    }
  }, [clockState, sessionStartTime]);

  // Generate report
  const generateReport = useCallback((): SessionReport => {
    const endTime = Date.now();
    const expectedTotalTime = (clockState.minutes + clockState.seconds / 60) * clockState.totalRounds * 60 * 1000;
    
    // Calculate round summaries using actual clock times
    const rounds: RoundSummary[] = [];
    for (let i = 1; i <= clockState.totalRounds; i++) {
      const roundEvents = sessionEvents.filter(e => e.round === i);
      const roundData = roundTimesRef.current.get(i) || {
        runTime: 0,
        pauseTime: 0,
        betweenRoundsTime: 0,
        startTime: sessionStartTime || 0,
        endTime: endTime
      };
      
      // Convert seconds to milliseconds for consistency
      const runTime = roundData.runTime * 1000;
      const pauseTime = roundData.pauseTime * 1000;
      const betweenRoundsTime = roundData.betweenRoundsTime * 1000;
      const totalTime = runTime + pauseTime + betweenRoundsTime;
      
      // Detect anomalies based on actual clock behavior
      const anomalies: string[] = [];
      const expectedRoundTime = expectedTotalTime / clockState.totalRounds;
      
      if (pauseTime > 120000) { // More than 2 minutes of pause
        anomalies.push('Excessive pause time');
      }
      if (runTime < expectedRoundTime * 0.8) { // Less than 80% of expected run time
        anomalies.push('Round shorter than expected');
      }
      if (i === clockState.currentRound && clockState.isRunning && !clockState.isPaused) {
        // Current active round
        anomalies.push('Round in progress');
      }
      
      rounds.push({
        round: i,
        startTime: roundData.startTime,
        endTime: roundData.endTime,
        runTime,
        pauseTime,
        betweenRoundsTime,
        totalTime,
        events: roundEvents,
        anomalies
      });
    }
    
    const totalRunTime = rounds.reduce((sum, r) => sum + r.runTime, 0);
    const totalPauseTime = rounds.reduce((sum, r) => sum + r.pauseTime, 0);
    const totalBetweenRoundsTime = rounds.reduce((sum, r) => sum + r.betweenRoundsTime, 0);
    const actualTotalTime = totalRunTime + totalPauseTime + totalBetweenRoundsTime;
    
    // Overall anomalies
    const anomalies: string[] = [];
    if (totalPauseTime > 300000) { // More than 5 minutes total pause
      anomalies.push('High total pause time');
    }
    if (actualTotalTime < expectedTotalTime * 0.9) {
      anomalies.push('Session significantly shorter than expected');
    }
    
    const allRoundAnomalies = rounds.flatMap(r => r.anomalies);
    anomalies.push(...allRoundAnomalies);
    
    const isValid = anomalies.length === 0 && actualTotalTime >= expectedTotalTime * 0.95;
    const validationStatus = isValid ? 'complete' : (anomalies.length > 0 ? 'with_anomalies' : 'incomplete');
    
    return {
      sessionId: sessionIdRef.current,
      startTime: sessionStartTime || 0,
      endTime,
      expectedTotalTime,
      actualTotalTime,
      totalRunTime,
      totalPauseTime,
      totalBetweenRoundsTime,
      rounds,
      anomalies,
      isValid,
      validationStatus
    };
  }, [clockState, sessionEvents, sessionStartTime]);

  // Real-time report generation
  useEffect(() => {
    if (sessionStartTime && sessionEvents.length > 0) {
      const report = generateReport();
      setCurrentReport(report);
    }
  }, [sessionEvents, clockState, generateReport, sessionStartTime]);

  // Track state changes
  useEffect(() => {
    const lastState = lastStateRef.current;
    if (lastState) {
      // Detect state changes
      if (!lastState.isRunning && clockState.isRunning && !clockState.isPaused) {
        if (!sessionStartTime) {
          setSessionStartTime(Date.now());
          sessionIdRef.current = generateSessionId();
        }
        addEvent('start');
      }
      
      if (lastState.isRunning && !lastState.isPaused && clockState.isPaused) {
        addEvent('pause');
      }
      
      if (lastState.isPaused && !clockState.isPaused && clockState.isRunning) {
        addEvent('resume');
      }
      
      if (lastState.currentRound !== clockState.currentRound) {
        // Round transition - finalize the previous round times
        if (lastState.currentRound > 0) {
          const prevRoundData = roundTimesRef.current.get(lastState.currentRound);
          if (prevRoundData) {
            roundTimesRef.current.set(lastState.currentRound, {
              ...prevRoundData,
              endTime: Date.now()
            });
          }
        }
        
        addEvent('round_end', { previousRound: lastState.currentRound }, lastState.currentRound);
        addEvent('round_start', { newRound: clockState.currentRound }, clockState.currentRound);
        
        // Initialize new round data
        if (!roundTimesRef.current.has(clockState.currentRound)) {
          roundTimesRef.current.set(clockState.currentRound, {
            runTime: 0,
            pauseTime: 0,
            betweenRoundsTime: 0,
            startTime: Date.now(),
            endTime: Date.now()
          });
        }
      }
      
      if (!lastState.isBetweenRounds && clockState.isBetweenRounds) {
        addEvent('between_rounds_start', undefined, clockState.currentRound);
      }
      
      if (lastState.isBetweenRounds && !clockState.isBetweenRounds) {
        addEvent('between_rounds_end', undefined, lastState.currentRound);
      }
    }
    
    lastStateRef.current = clockState;
  }, [clockState, sessionStartTime, generateSessionId, addEvent]);

  // Reset session
  const resetSession = useCallback(() => {
    setSessionEvents([]);
    setSessionStartTime(null);
    setCurrentReport(null);
    sessionIdRef.current = '';
    roundTimesRef.current.clear();
    addEvent('reset');
  }, [addEvent]);

  return {
    sessionEvents,
    sessionStartTime,
    sessionId: sessionIdRef.current,
    currentReport,
    resetSession,
    generateReport
  };
};
