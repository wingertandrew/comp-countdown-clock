import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Settings, Info, Plus, Minus, Copy, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClockState {
  minutes: number;
  seconds: number;
  currentRound: number;
  totalRounds: number;
  isRunning: boolean;
  isPaused: boolean;
  elapsedMinutes: number;
  elapsedSeconds: number;
  pauseStartTime: number | null;
  totalPausedTime: number;
  currentPauseDuration: number;
}

interface DebugLogEntry {
  timestamp: string;
  source: 'UI' | 'API' | 'WEBSOCKET';
  action: string;
  details?: any;
}

const CountdownClock = () => {
  const [clockState, setClockState] = useState<ClockState>({
    minutes: 5,
    seconds: 0,
    currentRound: 1,
    totalRounds: 3,
    isRunning: false,
    isPaused: false,
    elapsedMinutes: 0,
    elapsedSeconds: 0,
    pauseStartTime: null,
    totalPausedTime: 0,
    currentPauseDuration: 0
  });

  const [initialTime, setInitialTime] = useState({ minutes: 5, seconds: 0 });
  const [inputMinutes, setInputMinutes] = useState(5);
  const [inputSeconds, setInputSeconds] = useState(0);
  const [inputRounds, setInputRounds] = useState(3);
  const [activeTab, setActiveTab] = useState('clock');
  const [ntpOffset, setNtpOffset] = useState(0);
  const [ipAddress, setIpAddress] = useState('');
  const [ntpServer, setNtpServer] = useState('worldtimeapi.org');
  const [ntpDrift, setNtpDrift] = useState(0);
  const [lastNtpSync, setLastNtpSync] = useState('');
  const [debugLog, setDebugLog] = useState<DebugLogEntry[]>([]);
  const [debugFilter, setDebugFilter] = useState<'ALL' | 'UI' | 'API' | 'WEBSOCKET'>('ALL');
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  // Add debug log entry
  const addDebugLog = (source: 'UI' | 'API' | 'WEBSOCKET', action: string, details?: any) => {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      source,
      action,
      details
    };
    setDebugLog(prev => [entry, ...prev].slice(0, 100)); // Keep last 100 entries
  };

  // Get status color based on clock state
  const getStatusColor = () => {
    if (!clockState.isRunning) return 'red'; // stopped
    if (clockState.isPaused) return 'yellow'; // paused
    return 'green'; // running
  };

  // Get local IP address for display
  useEffect(() => {
    setIpAddress(window.location.hostname || 'localhost');
  }, []);

  // Handle page visibility changes to prevent background timing issues
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setLastUpdateTime(Date.now());
        addDebugLog('UI', 'Page hidden', { time: new Date().toISOString() });
      } else {
        const hiddenDuration = Date.now() - lastUpdateTime;
        if (hiddenDuration > 5000) { // If hidden for more than 5 seconds
          addDebugLog('UI', 'Page visible after extended period', { 
            hiddenDuration,
            syncingWithNTP: true
          });
          // Force NTP sync when page becomes visible again
          syncWithNTP();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastUpdateTime]);

  // WebSocket for API communication
  useEffect(() => {
    const isProduction = window.location.protocol === 'http:' || window.location.hostname === 'localhost' || window.location.hostname.includes('raspberrypi');
    
    if (isProduction) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.hostname}:${window.location.port || 8080}/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected for external control');
          addDebugLog('WEBSOCKET', 'Connected', { endpoint: `${protocol}//${window.location.hostname}:${window.location.port || 8080}/ws` });
        };

        ws.onmessage = (event) => {
          try {
            const command = JSON.parse(event.data);
            addDebugLog('WEBSOCKET', 'Received command', command);
            handleExternalCommand(command);
          } catch (error) {
            console.error('Invalid WebSocket message:', error);
            addDebugLog('WEBSOCKET', 'Invalid message', { error: error.message });
          }
        };

        ws.onerror = (error) => {
          console.log('WebSocket connection failed:', error);
          addDebugLog('WEBSOCKET', 'Connection failed', { error });
        };

        return () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (error) {
        console.log('WebSocket not available in this environment');
        addDebugLog('WEBSOCKET', 'Not available', { error: error.message });
      }
    } else {
      console.log('WebSocket disabled in development environment');
      addDebugLog('WEBSOCKET', 'Disabled in development');
    }
  }, []);

  const syncWithNTP = async () => {
    try {
      const before = Date.now();
      const response = await fetch(`http://${ntpServer}/api/timezone/Etc/UTC`);
      const after = Date.now();
      const data = await response.json();
      
      const serverTime = new Date(data.datetime).getTime();
      const networkDelay = (after - before) / 2;
      const clientTime = before + networkDelay;
      const offset = serverTime - clientTime;
      
      setNtpOffset(offset);
      addDebugLog('API', 'NTP sync completed', { offset, server: ntpServer });
      console.log('NTP sync completed. Offset:', offset, 'ms');
    } catch (error) {
      console.log('NTP sync failed, using local time:', error);
      addDebugLog('API', 'NTP sync failed', { error: error.message, fallback: 'local time' });
      setNtpOffset(0);
    }
  };

  useEffect(() => {
    syncWithNTP();
    const ntpInterval = setInterval(syncWithNTP, 300000);
    return () => clearInterval(ntpInterval);
  }, [ntpServer]);

  const getNTPTime = () => Date.now() + ntpOffset;

  // Track pause duration
  useEffect(() => {
    if (clockState.isPaused && clockState.pauseStartTime) {
      pauseIntervalRef.current = setInterval(() => {
        const currentTime = getNTPTime();
        const pauseDuration = Math.floor((currentTime - clockState.pauseStartTime!) / 1000);
        setClockState(prev => ({
          ...prev,
          currentPauseDuration: pauseDuration
        }));
      }, 1000);
    } else {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
      }
    }

    return () => {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
      }
    };
  }, [clockState.isPaused, clockState.pauseStartTime, ntpOffset]);

  const handleExternalCommand = (command: any) => {
    addDebugLog('API', 'External command received', command);
    switch (command.action) {
      case 'start':
        startTimer();
        break;
      case 'pause':
        pauseTimer();
        break;
      case 'reset':
        resetTimer();
        break;
      case 'next-round':
        nextRound();
        break;
      case 'previous-round':
        previousRound();
        break;
      case 'set-time':
        if (command.minutes !== undefined && command.seconds !== undefined) {
          setTime(command.minutes, command.seconds);
        }
        break;
      case 'set-rounds':
        if (command.rounds !== undefined) {
          setRounds(command.rounds);
        }
        break;
      case 'get-status':
        broadcastStatus();
        break;
    }
  };

  const broadcastStatus = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const status = {
        type: 'status',
        ...clockState,
        totalTime: initialTime,
        ntpTime: getNTPTime()
      };
      wsRef.current.send(JSON.stringify(status));
      addDebugLog('WEBSOCKET', 'Status broadcast', status);
    }
  };

  useEffect(() => {
    broadcastStatus();
  }, [clockState]);

  useEffect(() => {
    if (clockState.isRunning && !clockState.isPaused) {
      intervalRef.current = setInterval(() => {
        setLastUpdateTime(Date.now());
        setClockState(prev => {
          const newSeconds = prev.seconds - 1;
          const newMinutes = newSeconds < 0 ? prev.minutes - 1 : prev.minutes;
          const adjustedSeconds = newSeconds < 0 ? 59 : newSeconds;

          const totalElapsed = (initialTime.minutes * 60 + initialTime.seconds) - (newMinutes * 60 + adjustedSeconds);
          const elapsedMinutes = Math.floor(totalElapsed / 60);
          const elapsedSeconds = totalElapsed % 60;

          if (newMinutes < 0) {
            if (prev.currentRound < prev.totalRounds) {
              addDebugLog('UI', 'Round completed', { 
                completedRound: prev.currentRound, 
                nextRound: prev.currentRound + 1 
              });
              toast({
                title: `Round ${prev.currentRound} Complete!`,
                description: `Starting round ${prev.currentRound + 1}`,
              });
              return {
                ...prev,
                currentRound: prev.currentRound + 1,
                minutes: initialTime.minutes,
                seconds: initialTime.seconds,
                elapsedMinutes: 0,
                elapsedSeconds: 0
              };
            } else {
              addDebugLog('UI', 'All rounds completed', { totalRounds: prev.totalRounds });
              toast({
                title: "All Rounds Complete!",
                description: "Countdown finished",
              });
              return {
                ...prev,
                isRunning: false,
                minutes: 0,
                seconds: 0,
                elapsedMinutes,
                elapsedSeconds
              };
            }
          }

          return {
            ...prev,
            minutes: newMinutes,
            seconds: adjustedSeconds,
            elapsedMinutes,
            elapsedSeconds
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [clockState.isRunning, clockState.isPaused, initialTime, toast]);

  const startTimer = () => {
    addDebugLog('UI', 'Timer started');
    setClockState(prev => {
      let newTotalPausedTime = prev.totalPausedTime;
      if (prev.isPaused && prev.pauseStartTime) {
        newTotalPausedTime += Math.floor((getNTPTime() - prev.pauseStartTime) / 1000);
      }
      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        pauseStartTime: null,
        totalPausedTime: newTotalPausedTime,
        currentPauseDuration: 0
      };
    });
    toast({ title: "Timer Started" });
  };

  const pauseTimer = () => {
    const wasPaused = clockState.isPaused;
    addDebugLog('UI', wasPaused ? 'Timer resumed' : 'Timer paused');
    setClockState(prev => {
      if (prev.isPaused) {
        let newTotalPausedTime = prev.totalPausedTime;
        if (prev.pauseStartTime) {
          newTotalPausedTime += Math.floor((getNTPTime() - prev.pauseStartTime) / 1000);
        }
        return {
          ...prev,
          isPaused: false,
          pauseStartTime: null,
          totalPausedTime: newTotalPausedTime,
          currentPauseDuration: 0
        };
      } else {
        return {
          ...prev,
          isPaused: true,
          pauseStartTime: getNTPTime()
        };
      }
    });
    toast({ title: wasPaused ? "Timer Resumed" : "Timer Paused" });
  };

  const togglePlayPause = () => {
    if (!clockState.isRunning || clockState.isPaused) {
      startTimer();
    } else {
      pauseTimer();
    }
  };

  const resetTimer = () => {
    addDebugLog('UI', 'Timer reset', { resetToTime: initialTime });
    setClockState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      minutes: initialTime.minutes,
      seconds: initialTime.seconds,
      currentRound: 1,
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      pauseStartTime: null,
      totalPausedTime: 0,
      currentPauseDuration: 0
    }));
    toast({ title: "Timer Reset" });
  };

  const nextRound = () => {
    if (clockState.currentRound < clockState.totalRounds) {
      addDebugLog('UI', 'Next round', { 
        from: clockState.currentRound, 
        to: clockState.currentRound + 1 
      });
      setClockState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        minutes: initialTime.minutes,
        seconds: initialTime.seconds,
        elapsedMinutes: 0,
        elapsedSeconds: 0,
        totalPausedTime: 0,
        currentPauseDuration: 0,
        pauseStartTime: null
      }));
      toast({ title: `Round ${clockState.currentRound + 1} Started` });
    }
  };

  const previousRound = () => {
    if (clockState.currentRound > 1) {
      addDebugLog('UI', 'Previous round', { 
        from: clockState.currentRound, 
        to: clockState.currentRound - 1 
      });
      setClockState(prev => ({
        ...prev,
        currentRound: prev.currentRound - 1,
        minutes: initialTime.minutes,
        seconds: initialTime.seconds,
        elapsedMinutes: 0,
        elapsedSeconds: 0,
        totalPausedTime: 0,
        currentPauseDuration: 0,
        pauseStartTime: null
      }));
      toast({ title: `Round ${clockState.currentRound - 1} Started` });
    }
  };

  const adjustTimeBySeconds = (secondsToAdd: number) => {
    if (!clockState.isRunning) {
      const totalSeconds = clockState.minutes * 60 + clockState.seconds + secondsToAdd;
      const newMinutes = Math.floor(Math.max(0, totalSeconds) / 60);
      const newSeconds = Math.max(0, totalSeconds) % 60;
      
      addDebugLog('UI', 'Time adjusted by seconds', { 
        adjustment: secondsToAdd,
        newTime: { minutes: newMinutes, seconds: newSeconds }
      });
      
      setTime(newMinutes, newSeconds);
    }
  };

  const setTime = (minutes: number, seconds: number) => {
    const validMinutes = Math.max(0, Math.min(59, minutes));
    const validSeconds = Math.max(0, Math.min(59, seconds));
    
    setInitialTime({ minutes: validMinutes, seconds: validSeconds });
    setClockState(prev => ({
      ...prev,
      minutes: validMinutes,
      seconds: validSeconds,
      isRunning: false,
      isPaused: false,
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      pauseStartTime: null,
      totalPausedTime: 0,
      currentPauseDuration: 0
    }));
  };

  const setRounds = (rounds: number) => {
    const validRounds = Math.max(1, Math.min(15, rounds));
    setClockState(prev => ({
      ...prev,
      totalRounds: validRounds,
      currentRound: 1
    }));
  };

  const applySettings = () => {
    addDebugLog('UI', 'Settings applied', { 
      time: { minutes: inputMinutes, seconds: inputSeconds },
      rounds: inputRounds 
    });
    setTime(inputMinutes, inputSeconds);
    setRounds(inputRounds);
    setActiveTab('clock');
    toast({ title: "Settings Applied" });
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (clockState.isPaused) return 'PAUSED';
    if (clockState.isRunning) return 'RUNNING';
    return 'READY';
  };

  const copyCommand = (endpoint: string) => {
    const url = `${window.location.origin}/api${endpoint}`;
    const command = `curl -X POST ${url}`;
    navigator.clipboard.writeText(command);
    addDebugLog('UI', 'Command copied', { command });
    toast({ title: 'Command Copied', description: command });
  };

  const filteredDebugLog = debugLog.filter(entry => 
    debugFilter === 'ALL' || entry.source === debugFilter
  );

  const statusColor = getStatusColor();

  return (
    <div className="min-h-screen bg-black text-white">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <TabsList className="grid w-full grid-cols-4 mb-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="clock" className="text-lg py-3 data-[state=active]:bg-gray-600">Clock</TabsTrigger>
          <TabsTrigger value="settings" className="text-lg py-3 data-[state=active]:bg-gray-600">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="info" className="text-lg py-3 data-[state=active]:bg-gray-600">
            <Info className="w-5 h-5 mr-2" />
            API Info
          </TabsTrigger>
          <TabsTrigger value="debug" className="text-lg py-3 data-[state=active]:bg-gray-600">
            <Bug className="w-5 h-5 mr-2" />
            Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clock" className="space-y-4 p-4">
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
                <div className="text-[12rem] md:text-[20rem] font-bold tracking-wider text-white leading-none font-mono">
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
                  <span>{getStatusText()}</span>
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
                  onClick={() => adjustTimeBySeconds(-1)}
                  disabled={clockState.isRunning}
                  className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl text-3xl font-bold flex-1"
                >
                  <Minus className="w-8 h-8" />
                </Button>
                <Button
                  onClick={() => adjustTimeBySeconds(1)}
                  disabled={clockState.isRunning}
                  className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl text-3xl font-bold flex-1"
                >
                  <Plus className="w-8 h-8" />
                </Button>
              </div>

              {/* Round Controls */}
              <Button
                onClick={previousRound}
                disabled={clockState.currentRound <= 1}
                className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl"
              >
                <SkipBack className="w-10 h-10" />
              </Button>

              {/* Play/Pause Button - Wider */}
              <Button
                onClick={togglePlayPause}
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
                onClick={nextRound}
                disabled={clockState.currentRound >= clockState.totalRounds}
                className="h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-2xl"
              >
                <SkipForward className="w-10 h-10" />
              </Button>

              {/* Reset Button - Smaller */}
              <Button
                onClick={resetTimer}
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
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 p-4 min-h-screen bg-gray-900">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-4xl text-white mb-4">Timer Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center">
                  <label className="block text-3xl font-medium mb-6 text-white">Minutes</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={inputMinutes}
                    onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                    className="h-32 bg-gray-700 border-gray-500 text-center text-white text-6xl font-bold rounded-xl"
                  />
                  <div className="flex gap-6 mt-6">
                    <Button
                      onClick={() => setInputMinutes(Math.max(0, inputMinutes - 1))}
                      size="lg"
                      className="h-24 w-24 text-6xl bg-red-600 hover:bg-red-700 rounded-xl"
                    >
                      <Minus className="w-12 h-12" />
                    </Button>
                    <Button
                      onClick={() => setInputMinutes(Math.min(59, inputMinutes + 1))}
                      size="lg"
                      className="h-24 w-24 text-6xl bg-green-600 hover:bg-green-700 rounded-xl"
                    >
                      <Plus className="w-12 h-12" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <label className="block text-3xl font-medium mb-6 text-white">Seconds</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={inputSeconds}
                    onChange={(e) => setInputSeconds(parseInt(e.target.value) || 0)}
                    className="h-32 bg-gray-700 border-gray-500 text-center text-white text-6xl font-bold rounded-xl"
                  />
                  <div className="flex gap-6 mt-6">
                    <Button
                      onClick={() => setInputSeconds(Math.max(0, inputSeconds - 1))}
                      size="lg"
                      className="h-24 w-24 text-6xl bg-red-600 hover:bg-red-700 rounded-xl"
                    >
                      <Minus className="w-12 h-12" />
                    </Button>
                    <Button
                      onClick={() => setInputSeconds(Math.min(59, inputSeconds + 1))}
                      size="lg"
                      className="h-24 w-24 text-6xl bg-green-600 hover:bg-green-700 rounded-xl"
                    >
                      <Plus className="w-12 h-12" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <label className="block text-3xl font-medium mb-6 text-white">Rounds (1-15)</label>
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    value={inputRounds}
                    onChange={(e) => setInputRounds(parseInt(e.target.value) || 1)}
                    className="h-32 bg-gray-700 border-gray-500 text-center text-white text-6xl font-bold rounded-xl"
                  />
                  <div className="flex gap-6 mt-6">
                    <Button
                      onClick={() => setInputRounds(Math.max(1, inputRounds - 1))}
                      size="lg"
                      className="h-24 w-24 text-6xl bg-red-600 hover:bg-red-700 rounded-xl"
                    >
                      <Minus className="w-12 h-12" />
                    </Button>
                    <Button
                      onClick={() => setInputRounds(Math.min(15, inputRounds + 1))}
                      size="lg"
                      className="h-24 w-24 text-6xl bg-green-600 hover:bg-green-700 rounded-xl"
                    >
                      <Plus className="w-12 h-12" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* NTP Status Section */}
              <Card className="bg-gray-700 border-gray-500">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3">
                    <Clock className="w-8 h-8" />
                    Network Time Synchronization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {ntpOffset !== null ? (
                          <Wifi className="w-6 h-6 text-green-400" />
                        ) : (
                          <WifiOff className="w-6 h-6 text-red-400" />
                        )}
                        <span className="text-xl text-white">
                          Status: {ntpOffset !== null ? 'Synchronized' : 'Failed'}
                        </span>
                      </div>
                      
                      <div className="text-lg text-gray-300">
                        <strong className="text-white">Server:</strong> {ntpServer}
                      </div>
                      
                      <div className="text-lg text-gray-300">
                        <strong className="text-white">Last Sync:</strong> {lastNtpSync || 'Never'}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-lg text-gray-300">
                        <strong className="text-white">Offset:</strong> {ntpOffset !== null ? `${ntpOffset}ms` : 'N/A'}
                      </div>
                      
                      <div className="text-lg text-gray-300">
                        <strong className="text-white">Drift:</strong> {ntpDrift !== null ? `${ntpDrift}ms/min` : 'N/A'}
                      </div>
                      
                      <Button
                        onClick={syncWithNTP}
                        className="h-12 text-lg bg-blue-600 hover:bg-blue-700"
                      >
                        <Clock className="w-5 h-5 mr-2" />
                        Sync Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button
                onClick={applySettings}
                size="lg"
                className="w-full h-24 text-3xl bg-green-600 hover:bg-green-700 rounded-xl"
              >
                Apply Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-6 p-4 min-h-screen bg-gray-900">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-3xl text-white mb-4">HTTP API Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-xl text-gray-300 bg-gray-700 p-6 rounded-xl">
                <div className="text-2xl font-bold text-white mb-4">Server accessible at:</div>
                <ul className="list-disc list-inside mt-4 space-y-3">
                  <li>
                    <code className="bg-gray-900 px-4 py-2 rounded text-lg text-green-400">
                      http://{ipAddress}:{window.location.port || 8080}
                    </code>
                  </li>
                  {ipAddress !== 'localhost' && (
                    <li>
                      <code className="bg-gray-900 px-4 py-2 rounded text-lg text-green-400">
                        http://localhost:{window.location.port || 8080}
                      </code>
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-green-400 mb-6">Timer Controls</h3>
                  <div className="space-y-4 text-lg">
                    <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                      <div>
                        <code className="text-2xl text-green-300 font-bold">POST /start</code>
                        <p className="text-gray-300 mt-2 text-lg">Start the countdown timer</p>
                      </div>
                      <Button variant="ghost" size="lg" onClick={() => copyCommand('/start')} className="h-16 w-16">
                        <Copy className="w-8 h-8 text-white" />
                      </Button>
                    </div>
                    <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                      <div>
                        <code className="text-2xl text-yellow-300 font-bold">POST /pause</code>
                        <p className="text-gray-300 mt-2 text-lg">Pause/Resume the timer</p>
                      </div>
                      <Button variant="ghost" size="lg" onClick={() => copyCommand('/pause')} className="h-16 w-16">
                        <Copy className="w-8 h-8 text-white" />
                      </Button>
                    </div>
                    <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                      <div>
                        <code className="text-2xl text-red-300 font-bold">POST /reset</code>
                        <p className="text-gray-300 mt-2 text-lg">Reset timer to initial settings</p>
                      </div>
                      <Button variant="ghost" size="lg" onClick={() => copyCommand('/reset')} className="h-16 w-16">
                        <Copy className="w-8 h-8 text-white" />
                      </Button>
                    </div>
                    <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                      <div>
                        <code className="text-2xl text-blue-300 font-bold">POST /next-round</code>
                        <p className="text-gray-300 mt-2 text-lg">Skip to next round</p>
                      </div>
                      <Button variant="ghost" size="lg" onClick={() => copyCommand('/next-round')} className="h-16 w-16">
                        <Copy className="w-8 h-8 text-white" />
                      </Button>
                    </div>
                    <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                      <div>
                        <code className="text-2xl text-purple-300 font-bold">POST /previous-round</code>
                        <p className="text-gray-300 mt-2 text-lg">Go to previous round</p>
                      </div>
                      <Button variant="ghost" size="lg" onClick={() => copyCommand('/previous-round')} className="h-16 w-16">
                        <Copy className="w-8 h-8 text-white" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-blue-400 mb-6">Configuration</h3>
                  <div className="space-y-4 text-lg">
                    <div className="bg-gray-700 p-6 rounded-xl">
                      <code className="text-2xl text-purple-300 font-bold">POST /set-time</code>
                      <p className="text-gray-300 mt-2">Body: <code className="bg-gray-900 px-2 py-1 rounded">{"{"}"minutes": 5, "seconds": 30{"}"}</code></p>
                    </div>
                    <div className="bg-gray-700 p-6 rounded-xl">
                      <code className="text-2xl text-purple-300 font-bold">POST /set-rounds</code>
                      <p className="text-gray-300 mt-2">Body: <code className="bg-gray-900 px-2 py-1 rounded">{"{"}"rounds": 10{"}"}</code></p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-cyan-400 mb-6">Status & Display Pages</h3>
                  <div className="space-y-4 text-lg">
                    <div className="bg-gray-700 p-6 rounded-xl">
                      <code className="text-2xl text-cyan-300 font-bold">GET /status</code>
                      <p className="text-gray-300 mt-2">Get current timer state and settings</p>
                    </div>
                    <div className="bg-gray-700 p-6 rounded-xl">
                      <a href="/clockpretty" target="_blank" className="text-2xl text-cyan-300 underline font-bold">
                        <code>GET /clockpretty</code>
                      </a>
                      <p className="text-gray-300 mt-2">Beautiful dark dashboard display (read-only)</p>
                    </div>
                    <div className="bg-gray-700 p-6 rounded-xl">
                      <a href="/clockarena" target="_blank" className="text-2xl text-cyan-300 underline font-bold">
                        <code>GET /clockarena</code>
                      </a>
                      <p className="text-gray-300 mt-2">Compact arena-style countdown display</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-orange-400 mb-6">Bitfocus Companion Integration</h3>
                  <div className="bg-gray-700 p-6 rounded-xl text-lg">
                    <p className="text-gray-300 mb-4 text-xl">For Bitfocus Companion with Stream Deck:</p>
                    <ul className="list-disc list-inside space-y-3 text-gray-300">
                      <li className="text-lg">Use "Generic HTTP" module in Companion</li>
                      <li className="text-lg">Set target IP to your Pi's address: <code className="bg-gray-900 px-2 py-1 rounded">{ipAddress}</code></li>
                      <li className="text-lg">Use port: <code className="bg-gray-900 px-2 py-1 rounded">{window.location.port || 8080}</code></li>
                      <li className="text-lg">Set method to POST for timer controls</li>
                      <li className="text-lg">Use GET for status checks and feedback</li>
                      <li className="text-lg">Enable "Parse Variables in HTTP Data" for dynamic content</li>
                      <li className="text-lg">NTP synchronized for frame-accurate timing</li>
                    </ul>
                    
                    <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold text-white mb-3">Example Companion Setup:</h4>
                      <div className="space-y-2 text-gray-300">
                        <div><strong>Base URL:</strong> <code className="bg-gray-900 px-2 py-1 rounded">http://{ipAddress}:{window.location.port || 8080}</code></div>
                        <div><strong>Start Button:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/start</code></div>
                        <div><strong>Pause Button:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/pause</code></div>
                        <div><strong>Reset Button:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/reset</code></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6 p-4 min-h-screen bg-gray-900">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-3xl text-white mb-4">Debug Log</CardTitle>
              <div className="flex gap-4 flex-wrap">
                <Button
                  variant={debugFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setDebugFilter('ALL')}
                  className="text-lg h-12 px-6 text-white bg-gray-700 hover:bg-gray-600"
                >
                  All ({debugLog.length})
                </Button>
                <Button
                  variant={debugFilter === 'UI' ? 'default' : 'outline'}
                  onClick={() => setDebugFilter('UI')}
                  className="text-lg h-12 px-6 text-white bg-gray-700 hover:bg-gray-600"
                >
                  UI ({debugLog.filter(e => e.source === 'UI').length})
                </Button>
                <Button
                  variant={debugFilter === 'API' ? 'default' : 'outline'}
                  onClick={() => setDebugFilter('API')}
                  className="text-lg h-12 px-6 text-white bg-gray-700 hover:bg-gray-600"
                >
                  API ({debugLog.filter(e => e.source === 'API').length})
                </Button>
                <Button
                  variant={debugFilter === 'WEBSOCKET' ? 'default' : 'outline'}
                  onClick={() => setDebugFilter('WEBSOCKET')}
                  className="text-lg h-12 px-6 text-white bg-gray-700 hover:bg-gray-600"
                >
                  WebSocket ({debugLog.filter(e => e.source === 'WEBSOCKET').length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDebugLog([])}
                  className="text-lg h-12 px-6 text-white bg-red-600 hover:bg-red-700 ml-4"
                >
                  Clear Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredDebugLog.map((entry, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-xl text-lg border border-gray-600">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-gray-300 text-lg font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`px-3 py-1 rounded text-lg font-bold ${
                        entry.source === 'UI' ? 'bg-blue-600 text-white' :
                        entry.source === 'API' ? 'bg-green-600 text-white' :
                        'bg-purple-600 text-white'
                      }`}>
                        {entry.source}
                      </span>
                      <span className="text-white font-semibold text-lg">{entry.action}</span>
                    </div>
                    {entry.details && (
                      <pre className="text-gray-300 text-base overflow-x-auto bg-gray-800 p-3 rounded-lg border">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {filteredDebugLog.length === 0 && (
                  <div className="text-gray-400 text-center py-12 text-2xl">
                    No debug entries found for "{debugFilter}" filter
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CountdownClock;
