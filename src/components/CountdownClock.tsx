import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Settings, Info, Plus, Minus, Copy, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
      const response = await fetch(`https://${ntpServer}/api/timezone/Etc/UTC`);
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

  const getNextSyncMinutes = () => {
    if (!ntpStatus.lastSync) return 'N/A';
    const diff = ntpStatus.lastSync.getTime() + 1800000 - Date.now();
    return Math.max(0, Math.ceil(diff / 60000));
  };

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
  const borderColorClass =
    statusColor === 'red'
      ? 'border-red-500'
      : statusColor === 'yellow'
      ? 'border-yellow-500'
      : 'border-green-500';
  const bgColorClass =
    statusColor === 'red'
      ? 'bg-red-500'
      : statusColor === 'yellow'
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="min-h-screen bg-black text-white">
<<<<<<< HEAD
      <div className="h-screen flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-2 bg-gray-800 border-gray-700 flex-shrink-0">
            <TabsTrigger value="clock" className="text-xs sm:text-sm md:text-base lg:text-lg py-2 sm:py-3 data-[state=active]:bg-gray-600">Clock</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm md:text-base lg:text-lg py-2 sm:py-3 data-[state=active]:bg-gray-600">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs sm:text-sm md:text-base lg:text-lg py-2 sm:py-3 data-[state=active]:bg-gray-600">
              <Info className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-2" />
              API Info
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-xs sm:text-sm md:text-base lg:text-lg py-2 sm:py-3 data-[state=active]:bg-gray-600">
              <Bug className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-2" />
              Debug
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clock" className="flex-1 flex flex-col p-1 sm:p-2 md:p-4">
            <div className={cn('bg-black rounded-2xl sm:rounded-3xl p-2 sm:p-4 md:p-6 lg:p-8 border-2 sm:border-4 relative overflow-hidden flex-1 flex flex-col', borderColorClass)}>
              {/* Elapsed Time Header */}
              <div className={cn('absolute top-0 left-0 right-0 p-1 sm:p-2 md:p-4', bgColorClass)}>
                <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 text-black text-xs sm:text-lg md:text-xl lg:text-2xl font-bold">
                  <div className="w-2 h-2 sm:w-4 sm:h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 rounded-full bg-black flex items-center justify-center">
                    <div className={cn('w-1 h-1 sm:w-2 sm:h-2 md:w-3 md:h-3 lg:w-4 lg:h-4 rounded-full', bgColorClass)}></div>
                  </div>
                  <span className="text-xs sm:text-base md:text-xl lg:text-2xl">ELAPSED: {formatTime(clockState.elapsedMinutes, clockState.elapsedSeconds)}</span>
=======
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="clock" className="text-sm md:text-lg py-3 data-[state=active]:bg-gray-600">Clock</TabsTrigger>
          <TabsTrigger value="settings" className="text-sm md:text-lg py-3 data-[state=active]:bg-gray-600">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="info" className="text-sm md:text-lg py-3 data-[state=active]:bg-gray-600">
            <Info className="w-5 h-5 mr-2" />
            API Info
          </TabsTrigger>
          <TabsTrigger value="debug" className="text-sm md:text-lg py-3 data-[state=active]:bg-gray-600">
            <Bug className="w-5 h-5 mr-2" />
            Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clock" className="space-y-4 p-4">
          <div className={cn('bg-black rounded-3xl p-8 border-4 relative overflow-hidden', borderColorClass)}>
            {/* Elapsed Time Header */}
            <div className={cn('absolute top-0 left-0 right-0 p-4', bgColorClass)}>
              <div className="flex items-center justify-center gap-4 text-black text-2xl font-bold">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <div className={cn('w-4 h-4 rounded-full', bgColorClass)}></div>
                </div>
                <span>ELAPSED: {formatTime(clockState.elapsedMinutes, clockState.elapsedSeconds)}</span>
              </div>
            </div>

            {/* Main Timer Display */}
            <div className="mt-20 mb-8">
              <div className="text-center">
                <div className="text-[12rem] md:text-[20rem] font-bold tracking-wider text-white leading-none font-mono">
                  {formatTime(clockState.minutes, clockState.seconds)}
>>>>>>> parent of e38514e (feat: Implement UI scaling, documentation, and NTP status)
                </div>
              </div>
            </div>

<<<<<<< HEAD
              {/* Main Timer Display - Much Larger */}
              <div className="flex-1 flex items-center justify-center mt-8 sm:mt-12 md:mt-16 lg:mt-20 mb-2 sm:mb-4 md:mb-6 lg:mb-8">
                <div className="text-center w-full">
                  <div className="responsive-text font-bold tracking-wider text-white leading-[0.8] font-mono break-all">
                    {formatTime(clockState.minutes, clockState.seconds)}
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className={cn('rounded-lg sm:rounded-xl p-2 sm:p-4 md:p-6 lg:p-8 mb-2 sm:mb-4 md:mb-6', bgColorClass)}>
                <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 text-black text-sm sm:text-xl md:text-2xl lg:text-4xl font-bold">
                  <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
                    {clockState.isRunning && !clockState.isPaused ? (
                      <div className="w-0 h-0 border-l-[6px] sm:border-l-[10px] md:border-l-[15px] lg:border-l-[20px] border-l-black border-t-[3px] sm:border-t-[6px] md:border-t-[9px] lg:border-t-[12px] border-t-transparent border-b-[3px] sm:border-b-[6px] md:border-b-[9px] lg:border-b-[12px] border-b-transparent"></div>
                    ) : clockState.isPaused ? (
                      <div className="flex gap-1">
                        <div className="w-1 sm:w-2 md:w-3 lg:w-4 h-2 sm:h-4 md:h-6 lg:h-8 bg-black"></div>
                        <div className="w-1 sm:w-2 md:w-3 lg:w-4 h-2 sm:h-4 md:h-6 lg:h-8 bg-black"></div>
                      </div>
                    ) : (
                      <div className="w-2 sm:w-4 md:w-6 lg:w-8 h-2 sm:h-4 md:h-6 lg:h-8 bg-black"></div>
                    )}
                    <span className="text-xs sm:text-base md:text-2xl lg:text-4xl">{getStatusText()}</span>
                  </div>
                  {clockState.isPaused && (
                    <span className="text-orange-600 text-xs sm:text-sm md:text-xl lg:text-2xl">
                      - {formatDuration(clockState.currentPauseDuration)}
                    </span>
                  )}
                </div>
              </div>

              {/* IP Address */}
              <div className="mb-2 sm:mb-4 md:mb-6 lg:mb-8">
                <div className="flex items-center gap-1 sm:gap-2 text-white text-xs sm:text-sm md:text-lg lg:text-xl">
                  <div className="w-1 sm:w-2 md:w-3 lg:w-4 h-1 sm:h-2 md:h-3 lg:h-4 bg-white rounded-full"></div>
                  <span>{ipAddress}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-4">
                {/* Time Adjustment Group */}
                <div className="col-span-2 flex gap-1">
                  <Button
                    onClick={() => adjustTimeBySeconds(-1)}
                    disabled={clockState.isRunning}
                    className="h-8 sm:h-12 md:h-16 lg:h-20 xl:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-lg sm:rounded-xl md:rounded-2xl text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold flex-1"
                  >
                    <Minus className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
                  </Button>
                  <Button
                    onClick={() => adjustTimeBySeconds(1)}
                    disabled={clockState.isRunning}
                    className="h-8 sm:h-12 md:h-16 lg:h-20 xl:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-lg sm:rounded-xl md:rounded-2xl text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold flex-1"
                  >
                    <Plus className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
                  </Button>
                </div>

                {/* Round Controls */}
                <Button
                  onClick={previousRound}
                  disabled={clockState.currentRound <= 1}
                  className="h-8 sm:h-12 md:h-16 lg:h-20 xl:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-lg sm:rounded-xl md:rounded-2xl"
                >
                  <SkipBack className="w-3 h-3 sm:w-5 sm:h-5 md:w-7 md:h-7 lg:w-10 lg:h-10" />
                </Button>

                {/* Play/Pause Button - Wider */}
                <Button
                  onClick={togglePlayPause}
                  className="h-8 sm:h-12 md:h-16 lg:h-20 xl:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-lg sm:rounded-xl md:rounded-2xl col-span-2"
                >
                  {clockState.isRunning && !clockState.isPaused ? (
                    <div className="flex gap-1">
                      <div className="w-1 sm:w-2 md:w-3 lg:w-4 h-3 sm:h-6 md:h-9 lg:h-12 bg-black"></div>
                      <div className="w-1 sm:w-2 md:w-3 lg:w-4 h-3 sm:h-6 md:h-9 lg:h-12 bg-black"></div>
                    </div>
                  ) : (
                    <div className="w-0 h-0 border-l-[8px] sm:border-l-[12px] md:border-l-[18px] lg:border-l-[24px] border-l-black border-t-[6px] sm:border-t-[9px] md:border-t-[13px] lg:border-t-[18px] border-t-transparent border-b-[6px] sm:border-b-[9px] md:border-b-[13px] lg:border-b-[18px] border-b-transparent ml-1 sm:ml-2"></div>
                  )}
                </Button>

                <Button
                  onClick={nextRound}
                  disabled={clockState.currentRound >= clockState.totalRounds}
                  className="h-8 sm:h-12 md:h-16 lg:h-20 xl:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-lg sm:rounded-xl md:rounded-2xl"
                >
                  <SkipForward className="w-3 h-3 sm:w-5 sm:h-5 md:w-7 md:h-7 lg:w-10 lg:h-10" />
                </Button>

                {/* Reset Button - Smaller */}
                <Button
                  onClick={resetTimer}
                  className="h-8 sm:h-12 md:h-16 lg:h-20 xl:h-24 bg-gray-400 hover:bg-gray-300 text-black rounded-lg sm:rounded-xl md:rounded-2xl"
                >
                  <div className="w-2 sm:w-3 md:w-4 lg:w-6 h-2 sm:h-3 md:h-4 lg:h-6 bg-black rounded-sm"></div>
                </Button>
              </div>

              {/* Round Info */}
              <div className="text-center mt-2 sm:mt-4 md:mt-6 lg:mt-8 text-white text-sm sm:text-lg md:text-xl lg:text-2xl">
                Round {clockState.currentRound} of {clockState.totalRounds}
                {clockState.totalPausedTime > 0 && (
                  <div className="text-yellow-400 text-xs sm:text-sm md:text-lg lg:text-xl mt-1 sm:mt-2">
                    Total Paused: {formatDuration(clockState.totalPausedTime)}
                  </div>
=======
            {/* Status Bar */}
            <div className={cn('rounded-xl p-8 mb-6', bgColorClass)}>
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
>>>>>>> parent of e38514e (feat: Implement UI scaling, documentation, and NTP status)
                )}
              </div>
            </div>

<<<<<<< HEAD
          <TabsContent value="settings" className="flex-1 overflow-auto p-2 sm:p-4">
            <div className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-3xl text-white">Timer Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center">
                      <label className="block text-2xl font-medium mb-4 text-white">Minutes</label>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={inputMinutes}
                        onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                        className="responsive-text h-60 bg-gray-700 border-gray-600 text-center text-white"
                      />
                      <div className="flex gap-4 mt-4">
                        <Button
                          onClick={() => setInputMinutes(Math.max(0, inputMinutes - 1))}
                          size="lg"
                        className="h-28 w-28 text-7xl bg-red-600 hover:bg-red-700 flex items-center justify-center"
                        >
                          <Minus className="w-20 h-20" />
                        </Button>
                        <Button
                          onClick={() => setInputMinutes(Math.min(59, inputMinutes + 1))}
                          size="lg"
                        className="h-28 w-28 text-7xl bg-green-600 hover:bg-green-700 flex items-center justify-center"
                        >
                          <Plus className="w-20 h-20" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <label className="block text-2xl font-medium mb-4 text-white">Seconds</label>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={inputSeconds}
                        onChange={(e) => setInputSeconds(parseInt(e.target.value) || 0)}
                        className="responsive-text h-60 bg-gray-700 border-gray-600 text-center text-white"
                      />
                      <div className="flex gap-4 mt-4">
                        <Button
                          onClick={() => setInputSeconds(Math.max(0, inputSeconds - 1))}
                          size="lg"
                        className="h-28 w-28 text-7xl bg-red-600 hover:bg-red-700 flex items-center justify-center"
                        >
                          <Minus className="w-20 h-20" />
                        </Button>
                        <Button
                          onClick={() => setInputSeconds(Math.min(59, inputSeconds + 1))}
                          size="lg"
                        className="h-28 w-28 text-7xl bg-green-600 hover:bg-green-700 flex items-center justify-center"
                        >
                          <Plus className="w-20 h-20" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <label className="block text-2xl font-medium mb-4 text-white">Rounds (1-15)</label>
                      <Input
                        type="number"
                        min="1"
                        max="15"
                        value={inputRounds}
                        onChange={(e) => setInputRounds(parseInt(e.target.value) || 1)}
                        className="responsive-text h-60 bg-gray-700 border-gray-600 text-center text-white"
                      />
                      <div className="flex gap-4 mt-4">
                        <Button
                          onClick={() => setInputRounds(Math.max(1, inputRounds - 1))}
                          size="lg"
                        className="h-28 w-28 text-7xl bg-red-600 hover:bg-red-700 flex items-center justify-center"
                        >
                          <Minus className="w-20 h-20" />
                        </Button>
                        <Button
                          onClick={() => setInputRounds(Math.min(15, inputRounds + 1))}
                          size="lg"
                        className="h-28 w-28 text-7xl bg-green-600 hover:bg-green-700 flex items-center justify-center"
                        >
                          <Plus className="w-20 h-20" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-white">
                      <label className="block text-xl font-medium mb-2">NTP Server</label>
                      <Input
                        type="text"
                        value={ntpServer}
                        onChange={(e) => setNtpServer(e.target.value)}
                        className="text-lg bg-gray-700 border-gray-600 text-white"
                      />
                    </div>

                    {/* NTP Status Board */}
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        NTP Sync Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          {ntpStatus.isConnected ? (
                            <Wifi className="w-5 h-5 text-green-500" />
                          ) : (
                            <WifiOff className="w-5 h-5 text-red-500" />
                          )}
                          <span className={`text-sm ${ntpStatus.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                            {ntpStatus.isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300">
                          Server: {ntpStatus.server}
                        </div>
                        <div className="text-sm text-gray-300">
                          Last Sync: {ntpStatus.lastSync ? ntpStatus.lastSync.toLocaleTimeString() : 'Never'}
                        </div>
                        <div className="text-sm text-gray-300">
                          Offset: {ntpStatus.offset}ms
                        </div>
                        <div className="text-sm text-gray-300">
                          Drift: {ntpStatus.drift}ms
                        </div>
                        <div className="text-sm text-gray-300">
                          Next Sync: {getNextSyncMinutes()}m
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={applySettings}
                    size="lg"
                    className="w-full h-20 text-2xl bg-green-600 hover:bg-green-700"
                  >
                    Apply Settings
                  </Button>
                </CardContent>
              </Card>
=======
            {/* IP Address */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-white text-xl">
                <div className="w-4 h-4 bg-white rounded-full"></div>
                <span>{ipAddress}</span>
              </div>
>>>>>>> parent of e38514e (feat: Implement UI scaling, documentation, and NTP status)
            </div>

<<<<<<< HEAD
          <TabsContent value="info" className="flex-1 overflow-auto p-2 sm:p-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl text-white">HTTP API Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-lg text-gray-300">
                  <div>Server accessible at:</div>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>
                      <code className="bg-gray-900 px-2 py-1 rounded">http://{ipAddress}:{window.location.port || 8080}</code>
                    </li>
                    {ipAddress !== 'localhost' && (
                      <li>
                        <code className="bg-gray-900 px-2 py-1 rounded">http://localhost:{window.location.port || 8080}</code>
                      </li>
                    )}
                  </ul>
=======
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

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-3xl text-white">Timer Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center">
                  <label className="block text-2xl font-medium mb-4 text-white">Minutes</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={inputMinutes}
                    onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                    className="text-12xl h-60 bg-gray-700 border-gray-600 text-center text-white text-8xl"
                  />
                  <div className="flex gap-4 mt-4">
                    <Button
                      onClick={() => setInputMinutes(Math.max(0, inputMinutes - 1))}
                      size="lg"
                      className="h-20 w-20 text-4xl bg-red-600 hover:bg-red-700"
                    >
                      <Minus className="w-10 h-10" />
                    </Button>
                    <Button
                      onClick={() => setInputMinutes(Math.min(59, inputMinutes + 1))}
                      size="lg"
                      className="h-20 w-20 text-4xl bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-10 h-10" />
                    </Button>
                  </div>
>>>>>>> parent of e38514e (feat: Implement UI scaling, documentation, and NTP status)
                </div>
                
                <div className="flex flex-col items-center">
                  <label className="block text-2xl font-medium mb-4 text-white">Seconds</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={inputSeconds}
                    onChange={(e) => setInputSeconds(parseInt(e.target.value) || 0)}
                    className="text-12xl h-60 bg-gray-700 border-gray-600 text-center text-white text-8xl"
                  />
                  <div className="flex gap-4 mt-4">
                    <Button
                      onClick={() => setInputSeconds(Math.max(0, inputSeconds - 1))}
                      size="lg"
                      className="h-20 w-20 text-4xl bg-red-600 hover:bg-red-700"
                    >
                      <Minus className="w-10 h-10" />
                    </Button>
                    <Button
                      onClick={() => setInputSeconds(Math.min(59, inputSeconds + 1))}
                      size="lg"
                      className="h-20 w-20 text-4xl bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-10 h-10" />
                    </Button>
                  </div>
                </div>
<<<<<<< HEAD
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug" className="flex-1 overflow-auto p-2 sm:p-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Debug Log</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={debugFilter === 'ALL' ? 'default' : 'outline'}
                    onClick={() => setDebugFilter('ALL')}
                    className="text-white"
                  >
                    All
                  </Button>
                  <Button
                    variant={debugFilter === 'UI' ? 'default' : 'outline'}
                    onClick={() => setDebugFilter('UI')}
                    className="text-white"
                  >
                    UI
                  </Button>
                  <Button
                    variant={debugFilter === 'API' ? 'default' : 'outline'}
                    onClick={() => setDebugFilter('API')}
                    className="text-white"
                  >
                    API
                  </Button>
                  <Button
                    variant={debugFilter === 'WEBSOCKET' ? 'default' : 'outline'}
                    onClick={() => setDebugFilter('WEBSOCKET')}
                    className="text-white"
                  >
                    WebSocket
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDebugLog([])}
                    className="text-white ml-4"
                  >
                    Clear Log
                  </Button>
=======
                
                <div className="flex flex-col items-center">
                  <label className="block text-2xl font-medium mb-4 text-white">Rounds (1-15)</label>
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    value={inputRounds}
                    onChange={(e) => setInputRounds(parseInt(e.target.value) || 1)}
                    className="text-12xl h-60 bg-gray-700 border-gray-600 text-center text-white text-8xl"
                  />
                  <div className="flex gap-4 mt-4">
                    <Button
                      onClick={() => setInputRounds(Math.max(1, inputRounds - 1))}
                      size="lg"
                      className="h-20 w-20 text-4xl bg-red-600 hover:bg-red-700"
                    >
                      <Minus className="w-10 h-10" />
                    </Button>
                    <Button
                      onClick={() => setInputRounds(Math.min(15, inputRounds + 1))}
                      size="lg"
                      className="h-20 w-20 text-4xl bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-10 h-10" />
                    </Button>
                  </div>
>>>>>>> parent of e38514e (feat: Implement UI scaling, documentation, and NTP status)
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-white">
                  <label className="block text-xl font-medium mb-2">NTP Server</label>
                  <Input
                    type="text"
                    value={ntpServer}
                    onChange={(e) => setNtpServer(e.target.value)}
                    className="text-lg bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <Button
                onClick={applySettings}
                size="lg"
                className="w-full h-20 text-2xl bg-green-600 hover:bg-green-700"
              >
                Apply Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl text-white">HTTP API Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-lg text-gray-300">
                <div>Server accessible at:</div>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <code className="bg-gray-900 px-2 py-1 rounded">http://{ipAddress}:{window.location.port || 8080}</code>
                  </li>
                  {ipAddress !== 'localhost' && (
                    <li>
                      <code className="bg-gray-900 px-2 py-1 rounded">http://localhost:{window.location.port || 8080}</code>
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-green-400 mb-2">Timer Controls</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-900 p-3 rounded flex justify-between items-center">
                      <div>
                        <code className="text-green-300">POST /start</code>
                        <p className="text-gray-300 mt-1">Start the countdown timer</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyCommand('/start')}>
                        <Copy className="w-5 h-5 text-white" />
                      </Button>
                    </div>
                    <div className="bg-gray-900 p-3 rounded flex justify-between items-center">
                      <div>
                        <code className="text-yellow-300">POST /pause</code>
                        <p className="text-gray-300 mt-1">Pause/Resume the timer</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyCommand('/pause')}>
                        <Copy className="w-5 h-5 text-white" />
                      </Button>
                    </div>
                    <div className="bg-gray-900 p-3 rounded flex justify-between items-center">
                      <div>
                        <code className="text-red-300">POST /reset</code>
                        <p className="text-gray-300 mt-1">Reset timer to initial settings</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyCommand('/reset')}>
                        <Copy className="w-5 h-5 text-white" />
                      </Button>
                    </div>
                    <div className="bg-gray-900 p-3 rounded flex justify-between items-center">
                      <div>
                        <code className="text-blue-300">POST /next-round</code>
                        <p className="text-gray-300 mt-1">Skip to next round</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyCommand('/next-round')}>
                        <Copy className="w-5 h-5 text-white" />
                      </Button>
                    </div>
                    <div className="bg-gray-900 p-3 rounded flex justify-between items-center">
                      <div>
                        <code className="text-purple-300">POST /previous-round</code>
                        <p className="text-gray-300 mt-1">Go to previous round</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyCommand('/previous-round')}>
                        <Copy className="w-5 h-5 text-white" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-400 mb-2">Configuration</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-900 p-3 rounded">
                      <code className="text-purple-300">POST /set-time</code>
                      <p className="text-gray-300 mt-1">Body: <code>{"{"}"minutes": 5, "seconds": 30{"}"}</code></p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded">
                      <code className="text-purple-300">POST /set-rounds</code>
                      <p className="text-gray-300 mt-1">Body: <code>{"{"}"rounds": 10{"}"}</code></p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-cyan-400 mb-2">Status & Display Pages</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-900 p-3 rounded">
                      <code className="text-cyan-300">GET /status</code>
                      <p className="text-gray-300 mt-1">Get current timer state and settings</p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded">
                      <a href="/clockpretty" target="_blank" className="text-cyan-300 underline">
                        <code>GET /clockpretty</code>
                      </a>
                      <p className="text-gray-300 mt-1">Beautiful dark dashboard display (read-only)</p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded">
                      <a href="/clockarena" target="_blank" className="text-cyan-300 underline">
                        <code>GET /clockarena</code>
                      </a>
                      <p className="text-gray-300 mt-1">Compact arena-style countdown display</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-orange-400 mb-2">Stream Deck Integration</h3>
                  <div className="bg-gray-900 p-4 rounded text-sm">
                    <p className="text-gray-300 mb-2">For Stream Deck with Companion:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Use HTTP Request actions</li>
                      <li>Set method to POST for controls</li>
                      <li>Use GET for status checks</li>
                      <li>Configure with your Pi's IP address</li>
                      <li>NTP synchronized for accurate timing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Debug Log</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={debugFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setDebugFilter('ALL')}
                  className="text-white"
                >
                  All
                </Button>
                <Button
                  variant={debugFilter === 'UI' ? 'default' : 'outline'}
                  onClick={() => setDebugFilter('UI')}
                  className="text-white"
                >
                  UI
                </Button>
                <Button
                  variant={debugFilter === 'API' ? 'default' : 'outline'}
                  onClick={() => setDebugFilter('API')}
                  className="text-white"
                >
                  API
                </Button>
                <Button
                  variant={debugFilter === 'WEBSOCKET' ? 'default' : 'outline'}
                  onClick={() => setDebugFilter('WEBSOCKET')}
                  className="text-white"
                >
                  WebSocket
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDebugLog([])}
                  className="text-white ml-4"
                >
                  Clear Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredDebugLog.map((entry, index) => (
                  <div key={index} className="bg-gray-900 p-3 rounded text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        entry.source === 'UI' ? 'bg-blue-600' :
                        entry.source === 'API' ? 'bg-green-600' :
                        'bg-purple-600'
                      }`}>
                        {entry.source}
                      </span>
                      <span className="text-white font-medium">{entry.action}</span>
                    </div>
                    {entry.details && (
                      <pre className="text-gray-300 text-xs overflow-x-auto">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {filteredDebugLog.length === 0 && (
                  <div className="text-gray-400 text-center py-8">
                    No debug entries found
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
