import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Info, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClockState } from '@/types/clock';
import { useDebugLog } from '@/hooks/useDebugLog';
import { syncWithNTP, getNTPTime } from '@/utils/ntpUtils';
import ClockDisplay from './ClockDisplay';
import SettingsTab from './SettingsTab';
import ApiInfoTab from './ApiInfoTab';
import DebugTab from './DebugTab';

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
    currentPauseDuration: 0,
    isBetweenRounds: false,
    betweenRoundsMinutes: 1,
    betweenRoundsSeconds: 0
  });

  const [initialTime, setInitialTime] = useState({ minutes: 5, seconds: 0 });
  const [inputMinutes, setInputMinutes] = useState(5);
  const [inputSeconds, setInputSeconds] = useState(0);
  const [inputRounds, setInputRounds] = useState(3);
  const [betweenRoundsEnabled, setBetweenRoundsEnabled] = useState(false);
  const [betweenRoundsTime, setBetweenRoundsTime] = useState(60);
  const [activeTab, setActiveTab] = useState('clock');
  const [ntpOffset, setNtpOffset] = useState(0);
  const [ipAddress, setIpAddress] = useState('');
  const [ntpServer, setNtpServer] = useState('time.google.com');
  const [ntpDrift, setNtpDrift] = useState(0);
  const [lastNtpSync, setLastNtpSync] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  
  const { addDebugLog, ...debugLogProps } = useDebugLog();

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
        if (hiddenDuration > 5000) {
          addDebugLog('UI', 'Page visible after extended period', { 
            hiddenDuration,
            syncingWithNTP: true
          });
          handleSyncWithNTP();
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

  const handleSyncWithNTP = async () => {
    try {
      const { offset, lastSync } = await syncWithNTP(ntpServer);
      setNtpOffset(offset);
      setLastNtpSync(lastSync);
      addDebugLog('API', 'NTP sync completed', { offset, server: ntpServer });
    } catch (error) {
      addDebugLog('API', 'NTP sync failed', { error: error.message, fallback: 'local time' });
      setNtpOffset(0);
    }
  };

  useEffect(() => {
    handleSyncWithNTP();
    const ntpInterval = setInterval(handleSyncWithNTP, 1800000); // 30 minutes
    return () => clearInterval(ntpInterval);
  }, [ntpServer]);

  // Track pause duration
  useEffect(() => {
    if (clockState.isPaused && clockState.pauseStartTime) {
      pauseIntervalRef.current = setInterval(() => {
        const currentTime = getNTPTime(ntpOffset);
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
      case 'reset-time':
        resetTime();
        break;
      case 'reset-rounds':
        resetRounds();
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
        ntpTime: getNTPTime(ntpOffset)
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
          if (prev.isBetweenRounds) {
            // Count up during between rounds
            const newSeconds = prev.seconds + 1;
            const newMinutes = newSeconds >= 60 ? prev.minutes + 1 : prev.minutes;
            const adjustedSeconds = newSeconds >= 60 ? 0 : newSeconds;

            const totalBetweenRoundsTime = Math.floor(betweenRoundsTime / 60) * 60 + (betweenRoundsTime % 60);
            const currentBetweenRoundsTime = newMinutes * 60 + adjustedSeconds;

            if (currentBetweenRoundsTime >= totalBetweenRoundsTime) {
              // Between rounds time complete, advance to next round
              addDebugLog('UI', 'Between rounds completed - Advancing to next round', {
                completedRound: prev.currentRound,
                nextRound: prev.currentRound + 1
              });
              
              if (prev.currentRound < prev.totalRounds) {
                toast({
                  title: `Between Rounds Complete!`,
                  description: `Starting Round ${prev.currentRound + 1}`,
                });
                return {
                  ...prev,
                  currentRound: prev.currentRound + 1,
                  minutes: initialTime.minutes,
                  seconds: initialTime.seconds,
                  isBetweenRounds: false,
                  betweenRoundsMinutes: 0,
                  betweenRoundsSeconds: 0,
                  elapsedMinutes: 0,
                  elapsedSeconds: 0,
                  isRunning: false,
                  isPaused: false,
                  totalPausedTime: 0,
                  currentPauseDuration: 0,
                  pauseStartTime: null
                };
              } else {
                toast({
                  title: "All Rounds Complete!",
                  description: "Tournament finished",
                });
                return {
                  ...prev,
                  isRunning: false,
                  isBetweenRounds: false,
                  betweenRoundsMinutes: Math.floor(totalBetweenRoundsTime / 60),
                  betweenRoundsSeconds: totalBetweenRoundsTime % 60
                };
              }
            }

            return {
              ...prev,
              minutes: newMinutes,
              seconds: adjustedSeconds,
              betweenRoundsMinutes: newMinutes,
              betweenRoundsSeconds: adjustedSeconds
            };
          } else {
            // Regular countdown logic
            const newSeconds = prev.seconds - 1;
            const newMinutes = newSeconds < 0 ? prev.minutes - 1 : prev.minutes;
            const adjustedSeconds = newSeconds < 0 ? 59 : newSeconds;

            const totalElapsed = (initialTime.minutes * 60 + initialTime.seconds) - (newMinutes * 60 + adjustedSeconds);
            const elapsedMinutes = Math.floor(totalElapsed / 60);
            const elapsedSeconds = totalElapsed % 60;

            if (newMinutes < 0) {
              if (prev.currentRound < prev.totalRounds) {
                if (betweenRoundsEnabled) {
                  // Start between rounds timer
                  addDebugLog('UI', 'Round completed - Starting between rounds timer', { 
                    completedRound: prev.currentRound,
                    betweenRoundsTime: betweenRoundsTime 
                  });
                  toast({
                    title: `Round ${prev.currentRound} Complete!`,
                    description: `Between rounds timer started`,
                  });
                  return {
                    ...prev,
                    minutes: 0,
                    seconds: 0,
                    isBetweenRounds: true,
                    betweenRoundsMinutes: 0,
                    betweenRoundsSeconds: 0,
                    elapsedMinutes,
                    elapsedSeconds,
                    isRunning: true,
                    isPaused: false
                  };
                } else {
                  // Auto-advance to next round without between rounds timer
                  addDebugLog('UI', 'Round completed - Auto advancing', { 
                    completedRound: prev.currentRound, 
                    nextRound: prev.currentRound + 1 
                  });
                  toast({
                    title: `Round ${prev.currentRound} Complete!`,
                    description: `Auto-advancing to round ${prev.currentRound + 1}`,
                  });
                  return {
                    ...prev,
                    currentRound: prev.currentRound + 1,
                    minutes: initialTime.minutes,
                    seconds: initialTime.seconds,
                    elapsedMinutes: 0,
                    elapsedSeconds: 0,
                    isRunning: true,
                    isPaused: false
                  };
                }
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
          }
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
  }, [clockState.isRunning, clockState.isPaused, initialTime, toast, betweenRoundsEnabled, betweenRoundsTime]);

  const startTimer = () => {
    addDebugLog('UI', 'Timer started');
    setClockState(prev => {
      let newTotalPausedTime = prev.totalPausedTime;
      if (prev.isPaused && prev.pauseStartTime) {
        newTotalPausedTime += Math.floor((getNTPTime(ntpOffset) - prev.pauseStartTime) / 1000);
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
          newTotalPausedTime += Math.floor((getNTPTime(ntpOffset) - prev.pauseStartTime) / 1000);
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
          pauseStartTime: getNTPTime(ntpOffset)
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

  const resetTime = () => {
    addDebugLog('UI', 'Time reset', { resetToTime: initialTime });
    setClockState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      minutes: initialTime.minutes,
      seconds: initialTime.seconds,
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      pauseStartTime: null,
      totalPausedTime: 0,
      currentPauseDuration: 0
    }));
    toast({ title: 'Time Reset' });
  };

  const resetRounds = () => {
    addDebugLog('UI', 'Rounds reset', { totalRounds: clockState.totalRounds });
    setClockState(prev => ({
      ...prev,
      currentRound: 1,
      isRunning: false,
      isPaused: false,
      minutes: initialTime.minutes,
      seconds: initialTime.seconds,
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      pauseStartTime: null,
      totalPausedTime: 0,
      currentPauseDuration: 0
    }));
    toast({ title: 'Rounds Reset' });
  };

  const resetTimer = () => {
    resetRounds();
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
        isRunning: false,
        isPaused: false,
        totalPausedTime: 0,
        currentPauseDuration: 0,
        pauseStartTime: null,
        isBetweenRounds: false,
        betweenRoundsMinutes: 0,
        betweenRoundsSeconds: 0
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
        isRunning: false,
        isPaused: false,
        totalPausedTime: 0,
        currentPauseDuration: 0,
        pauseStartTime: null,
        isBetweenRounds: false,
        betweenRoundsMinutes: 0,
        betweenRoundsSeconds: 0
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
      rounds: inputRounds,
      betweenRoundsEnabled,
      betweenRoundsTime
    });
    setTime(inputMinutes, inputSeconds);
    setRounds(inputRounds);
    setActiveTab('clock');
    toast({ title: "Settings Applied" });
  };

  const handleCommandCopy = (command: string) => {
    addDebugLog('UI', 'Command copied', { command });
    toast({ title: 'Command Copied', description: command });
  };

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

        <TabsContent value="clock" className="space-y-4">
          <ClockDisplay
            clockState={clockState}
            ipAddress={ipAddress}
            onTogglePlayPause={togglePlayPause}
            onNextRound={nextRound}
            onPreviousRound={previousRound}
            onResetTime={resetTime}
            onResetRounds={resetRounds}
            onAdjustTimeBySeconds={adjustTimeBySeconds}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab
            inputMinutes={inputMinutes}
            inputSeconds={inputSeconds}
            inputRounds={inputRounds}
            betweenRoundsEnabled={betweenRoundsEnabled}
            betweenRoundsTime={betweenRoundsTime}
            ntpOffset={ntpOffset}
            ntpServer={ntpServer}
            lastNtpSync={lastNtpSync}
            ntpDrift={ntpDrift}
            setInputMinutes={setInputMinutes}
            setInputSeconds={setInputSeconds}
            setInputRounds={setInputRounds}
            setBetweenRoundsEnabled={setBetweenRoundsEnabled}
            setBetweenRoundsTime={setBetweenRoundsTime}
            onApplySettings={applySettings}
            onSyncWithNTP={handleSyncWithNTP}
          />
        </TabsContent>

        <TabsContent value="info">
          <ApiInfoTab
            ipAddress={ipAddress}
            onCommandCopy={handleCommandCopy}
          />
        </TabsContent>

        <TabsContent value="debug">
          <DebugTab
            {...debugLogProps}
            onClearDebugLog={debugLogProps.clearDebugLog}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CountdownClock;
