
import React, { useState, useEffect } from 'react';

interface ClockData {
  minutes: number;
  seconds: number;
  currentRound: number;
  totalRounds: number;
  isRunning: boolean;
  isPaused: boolean;
  elapsedMinutes: number;
  elapsedSeconds: number;
  totalPausedTime: number;
  currentPauseDuration: number;
}

const ClockPretty = () => {
  const [clockData, setClockData] = useState<ClockData>({
    minutes: 5,
    seconds: 0,
    currentRound: 1,
    totalRounds: 3,
    isRunning: false,
    isPaused: false,
    elapsedMinutes: 0,
    elapsedSeconds: 0,
    totalPausedTime: 0,
    currentPauseDuration: 0
  });

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.hostname}:${window.location.port || 8080}/ws`);

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

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (clockData.isPaused) return 'text-yellow-400';
    if (clockData.isRunning) return 'text-green-400';
    return 'text-red-400';
  };

  const getStatusText = () => {
    if (clockData.isPaused) return 'PAUSED';
    if (clockData.isRunning) return 'RUNNING';
    return 'STOPPED';
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      {/* Main Timer Display */}
      <div className="text-center mb-8">
        <div className="text-[20rem] font-mono font-bold tracking-wider mb-8 text-white leading-none">
          {formatTime(clockData.minutes, clockData.seconds)}
        </div>
        
        {/* Status Indicator */}
        <div className={`text-6xl font-bold mb-6 ${getStatusColor()}`}>
          {getStatusText()}
          {clockData.isPaused && (
            <div className="text-4xl animate-pulse mt-2">
              {formatDuration(clockData.currentPauseDuration)}
            </div>
          )}
        </div>
      </div>

      {/* Round Information */}
      <div className="text-center mb-8">
        <div className="text-8xl font-bold text-blue-400 mb-4">
          ROUND {clockData.currentRound} / {clockData.totalRounds}
        </div>
        
        {/* Progress Bar */}
        <div className="w-96 h-6 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${(clockData.currentRound / clockData.totalRounds) * 100}%` }}
          />
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-16 text-center">
        <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-700">
          <div className="text-2xl text-gray-400 mb-2">TIME ELAPSED</div>
          <div className="text-5xl font-mono font-bold text-green-400">
            {formatTime(clockData.elapsedMinutes, clockData.elapsedSeconds)}
          </div>
        </div>
        
        <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-700">
          <div className="text-2xl text-gray-400 mb-2">TOTAL PAUSED</div>
          <div className="text-5xl font-mono font-bold text-yellow-400">
            {formatDuration(clockData.totalPausedTime)}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ClockPretty;
