
import { useState, useCallback, useRef, useEffect } from 'react';
import { SessionEvent, RoundSummary, SessionReport, ClockState } from '@/types/clock';

export const useSessionTracking = (clockState: ClockState) => {
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const sessionIdRef = useRef<string>('');
  const lastStateRef = useRef<ClockState | null>(null);

  // Generate session ID when session starts
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add event to session
  const addEvent = useCallback((type: SessionEvent['type'], data?: any) => {
    const event: SessionEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      round: clockState.currentRound,
      data
    };
    setSessionEvents(prev => [...prev, event]);
  }, [clockState.currentRound]);

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
        addEvent('round_end', { previousRound: lastState.currentRound });
        addEvent('round_start', { newRound: clockState.currentRound });
      }
      
      if (!lastState.isBetweenRounds && clockState.isBetweenRounds) {
        addEvent('between_rounds_start');
      }
      
      if (lastState.isBetweenRounds && !clockState.isBetweenRounds) {
        addEvent('between_rounds_end');
      }
    }
    
    lastStateRef.current = clockState;
  }, [clockState, sessionStartTime, generateSessionId, addEvent]);

  // Reset session
  const resetSession = useCallback(() => {
    setSessionEvents([]);
    setSessionStartTime(null);
    sessionIdRef.current = '';
    addEvent('reset');
  }, [addEvent]);

  // Generate report
  const generateReport = useCallback((): SessionReport => {
    const endTime = Date.now();
    const expectedTotalTime = (clockState.minutes + clockState.seconds / 60) * clockState.totalRounds * 60 * 1000;
    
    // Calculate round summaries
    const rounds: RoundSummary[] = [];
    for (let i = 1; i <= clockState.totalRounds; i++) {
      const roundEvents = sessionEvents.filter(e => e.round === i);
      const roundStart = roundEvents.find(e => e.type === 'round_start')?.timestamp || sessionStartTime || 0;
      const roundEnd = roundEvents.find(e => e.type === 'round_end')?.timestamp || endTime;
      
      const pauseEvents = roundEvents.filter(e => e.type === 'pause');
      const resumeEvents = roundEvents.filter(e => e.type === 'resume');
      
      let pauseTime = 0;
      pauseEvents.forEach((pause, index) => {
        const resume = resumeEvents[index];
        if (resume) {
          pauseTime += resume.timestamp - pause.timestamp;
        }
      });
      
      const betweenRoundsEvents = roundEvents.filter(e => e.type === 'between_rounds_start' || e.type === 'between_rounds_end');
      let betweenRoundsTime = 0;
      if (betweenRoundsEvents.length >= 2) {
        betweenRoundsTime = betweenRoundsEvents[1].timestamp - betweenRoundsEvents[0].timestamp;
      }
      
      const totalTime = roundEnd - roundStart;
      const runTime = totalTime - pauseTime - betweenRoundsTime;
      
      // Detect anomalies
      const anomalies: string[] = [];
      if (pauseTime > 120000) { // More than 2 minutes of pause
        anomalies.push('Excessive pause time');
      }
      if (runTime < expectedTotalTime * 0.8 / clockState.totalRounds) { // Less than 80% of expected time
        anomalies.push('Round shorter than expected');
      }
      
      rounds.push({
        round: i,
        startTime: roundStart,
        endTime: roundEnd,
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

  return {
    sessionEvents,
    sessionStartTime,
    sessionId: sessionIdRef.current,
    resetSession,
    generateReport
  };
};
