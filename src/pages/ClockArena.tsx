
import React, { useState, useEffect, useRef } from 'react';

interface ClockData {
  minutes: number;
  seconds: number;
  currentRound: number;
  totalRounds: number;
  isRunning: boolean;
  isPaused: boolean;
  isBetweenRounds: boolean;
  betweenRoundsMinutes: number;
  betweenRoundsSeconds: number;
  ntpOffset?: number;
}

const ClockArena = () => {
  const [clockData, setClockData] = useState<ClockData>({
    minutes: 5,
    seconds: 0,
    currentRound: 1,
    totalRounds: 3,
    isRunning: false,
    isPaused: false,
    isBetweenRounds: false,
    betweenRoundsMinutes: 0,
    betweenRoundsSeconds: 0,
    ntpOffset: 0
  });

  const [warningSoundPath, setWarningSoundPath] = useState<string | null>(null);
  const [endSoundPath, setEndSoundPath] = useState<string | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const endAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load audio paths from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setWarningSoundPath(localStorage.getItem('warningSoundPath'));
    setEndSoundPath(localStorage.getItem('endSoundPath'));
  }, []);

  // Update audio refs when paths change
  useEffect(() => {
    warningAudioRef.current = warningSoundPath ? new Audio(warningSoundPath) : null;
  }, [warningSoundPath]);

  useEffect(() => {
    endAudioRef.current = endSoundPath ? new Audio(endSoundPath) : null;
  }, [endSoundPath]);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.hostname}:${window.location.port || 4040}/ws`);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'status') {
              setClockData(data);
            }
          } catch (error) {
            console.error('Invalid WebSocket message:', error);
          }
        };

        ws.onerror = () => {
          console.log('WebSocket connection failed, retrying in 5 seconds...');
          setTimeout(connectWebSocket, 5000);
        };

        return ws;
      } catch (error) {
        console.log('WebSocket not available');
        return null;
      }
    };

    const ws = connectWebSocket();
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (clockData.isPaused) return 'text-yellow-400';
    if (clockData.isBetweenRounds) return 'text-purple-400';
    if (clockData.isRunning) return 'text-green-400';
    if (!clockData.isBetweenRounds && clockData.minutes === 0 && clockData.seconds <= 10) return 'text-red-400 animate-pulse';
    return 'text-white';
  };

  const getRoundColor = () => {
    return clockData.isRunning ? 'text-blue-400' : 'text-gray-400';
  };

  const playAudio = async (ref: React.RefObject<HTMLAudioElement | null>) => {
    if (!ref.current) return;
    try {
      await ref.current.play();
    } catch {
      // ignore playback errors
    }
  };

  // Play audio at 10s warning and end
  useEffect(() => {
    if (
      clockData.isRunning &&
      !clockData.isPaused &&
      !clockData.isBetweenRounds
    ) {
      if (clockData.minutes === 0 && clockData.seconds === 10 && warningAudioRef.current) {
        playAudio(warningAudioRef);
      }
      if (clockData.minutes === 0 && clockData.seconds === 0 && endAudioRef.current) {
        playAudio(endAudioRef);
      }
    }
  }, [clockData.minutes, clockData.seconds, clockData.isRunning, clockData.isPaused, clockData.isBetweenRounds]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Left Corner - Main Timer */}
      <div className="absolute top-8 left-8">
        <div className={`text-8xl font-mono font-bold tracking-wider mb-2 ${getTimerColor()}`}>
          {clockData.isBetweenRounds 
            ? formatTime(clockData.betweenRoundsMinutes, clockData.betweenRoundsSeconds)
            : formatTime(clockData.minutes, clockData.seconds)
          }
        </div>
        
        {/* Round Indicator */}
        <div className={`text-2xl font-bold ${getRoundColor()}`}>
          R{clockData.currentRound}/{clockData.totalRounds}
        </div>
        
        {/* Status Indicator */}
        {clockData.isPaused && (
          <div className="text-xl text-yellow-400 animate-pulse mt-1">
            ⏸️ PAUSED
          </div>
        )}
        
        {clockData.isBetweenRounds && (
          <div className="text-xl text-purple-400 animate-pulse mt-1">
            🔄 BETWEEN ROUNDS
          </div>
        )}
        
        {!clockData.isRunning && !clockData.isPaused && !clockData.isBetweenRounds && (
          <div className="text-xl text-red-400 mt-1">
            ⏹️ STOPPED
          </div>
        )}
        
        {clockData.isRunning && !clockData.isPaused && !clockData.isBetweenRounds && (
          <div className="text-xl text-green-400 mt-1">
            ▶️ RUNNING
          </div>
        )}
      </div>

      {/* Background Arena Graphics */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Corner Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 border-r-4 border-t-4 border-blue-500"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 border-l-4 border-b-4 border-blue-500"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-blue-500"></div>
      </div>

      {/* Center Logo/Text Area (Available for customization) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-6xl font-bold text-gray-800 opacity-20">
          ARENA
        </div>
      </div>

      {/* Bottom Right - Round Progress */}
      <div className="absolute bottom-8 right-8">
        <div className="flex space-x-2">
          {Array.from({ length: clockData.totalRounds }, (_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full border-2 ${
                i + 1 <= clockData.currentRound
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClockArena;
