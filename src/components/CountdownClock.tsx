
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Info, Server, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClockState, NTPSyncStatus, ClockStatusVisitor } from '@/types/clock';
import { useDebugLog } from '@/hooks/useDebugLog';
import { NTPSyncManager, DEFAULT_NTP_CONFIG } from '@/utils/ntpSync';

import ClockDisplay from './ClockDisplay';
import SettingsTab from './SettingsTab';
import InfoTab from './InfoTab';
import ApiInfoTab from './ApiInfoTab';
import DebugTab from './DebugTab';
import FloatingClock from './FloatingClock';

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
    betweenRoundsMinutes: 0,
    betweenRoundsSeconds: 0,
    betweenRoundsEnabled: true,
    betweenRoundsTime: 60,
    ntpSyncEnabled: false,
    ntpSyncInterval: 21600000, // 6 hours default
    ntpDriftThreshold: 50,
    ntpOffset: 0
  });

  const [initialTime, setInitialTime] = useState({ minutes: 5, seconds: 0 });
  const [inputMinutes, setInputMinutes] = useState(5);
  const [inputSeconds, setInputSeconds] = useState(0);
  const [inputRounds, setInputRounds] = useState(3);
  const [betweenRoundsEnabled, setBetweenRoundsEnabled] = useState(true);
  const [betweenRoundsTime, setBetweenRoundsTime] = useState(60);
  const [ntpSyncEnabled, setNtpSyncEnabled] = useState(false);
  const [ntpSyncInterval, setNtpSyncInterval] = useState(21600000); // 6 hours default
  const [ntpDriftThreshold, setNtpDriftThreshold] = useState(50);
  const [warningAudioPath, setWarningAudioPath] = useState('');
  const [endAudioPath, setEndAudioPath] = useState('');
  const [warningAudioFile, setWarningAudioFile] = useState<File | null>(null);
  const [endAudioFile, setEndAudioFile] = useState<File | null>(null);
  const [audioAlertStatus, setAudioAlertStatus] = useState<string | null>(null);
  const [audioAlertsPlayedThisRound, setAudioAlertsPlayedThisRound] = useState<Set<string>>(new Set());
  const [ntpSyncStatus, setNtpSyncStatus] = useState<NTPSyncStatus>({
    enabled: false,
    lastSync: 0,
    timeOffset: 0,
    healthy: false,
    syncCount: 0,
    errorCount: 0
  });
  const [activeTab, setActiveTab] = useState('clock');
  const [ipAddress, setIpAddress] = useState('');
  const [connectedClients, setConnectedClients] = useState<any[]>([]);
  const [clockStatusVisitors, setClockStatusVisitors] = useState<ClockStatusVisitor[]>([]);
  const [settingsSynced, setSettingsSynced] = useState(true);
  const syncFromServerRef = useRef(false);

  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const ntpManagerRef = useRef<NTPSyncManager | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const endAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { addDebugLog, ...debugLogProps } = useDebugLog();

  // Auto-sync time settings to server with debouncing
  const syncTimeToServer = useCallback(async (minutes: number, seconds: number, silent = false) => {
    try {
      const response = await fetch('/api/set-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, seconds })
      });
      
      if (response.ok) {
        setInitialTime({ minutes, seconds });
        setClockState(prev => ({
          ...prev,
          minutes,
          seconds
        }));
        setSettingsSynced(true);
        addDebugLog('UI', 'Time auto-synced to server', { minutes, seconds });
        if (!silent) {
          toast({ title: 'Time settings synchronized' });
        }
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to auto-sync time', { error: error.message });
      setSettingsSynced(false);
    }
  }, [addDebugLog, toast]);

  // Debounced auto-sync for time settings (only for user input, not server updates)
  useEffect(() => {
    // Skip auto-sync if this change came from server
    if (syncFromServerRef.current) {
      syncFromServerRef.current = false;
      return;
    }
    
    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }
    
    setSettingsSynced(false);
    
    autoSyncTimeoutRef.current = setTimeout(() => {
      syncTimeToServer(inputMinutes, inputSeconds, true);
    }, 500);

    return () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
      }
    };
  }, [inputMinutes, inputSeconds, syncTimeToServer]);

// Load audio paths from server or fallback to localStorage
useEffect(() => {
  const loadAudioPaths = async () => {
    try {
      const res = await fetch('/api/audio');
      const data = await res.json();

      if (data.warningSoundPath) {
        setWarningAudioPath(data.warningSoundPath);
        if (typeof window !== 'undefined') {
          localStorage.setItem('warningSoundPath', data.warningSoundPath);
        }
      }

      if (data.endSoundPath) {
        setEndAudioPath(data.endSoundPath);
        if (typeof window !== 'undefined') {
          localStorage.setItem('endSoundPath', data.endSoundPath);
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        const warn = localStorage.getItem('warningSoundPath');
        const end = localStorage.getItem('endSoundPath');
        if (warn) setWarningAudioPath(warn);
        if (end) setEndAudioPath(end);
      }
    }
  };

  loadAudioPaths();
}, []);

  // Get local IP address for display
  useEffect(() => {
    setIpAddress(window.location.hostname || 'localhost');
  }, []);

  // WebSocket for server communication
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected - syncing with server');
          addDebugLog('WEBSOCKET', 'Connected to server', { endpoint: wsUrl });
          
          ws.send(JSON.stringify({
            type: 'sync-settings',
            url: window.location.href,
            initialTime,
            totalRounds: inputRounds,
            betweenRoundsEnabled,
            betweenRoundsTime,
            ntpSyncEnabled,
            ntpSyncInterval,
            ntpDriftThreshold
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            addDebugLog('WEBSOCKET', 'Received from server', data);
            
            if (data.type === 'status') {
              setClockState(prev => ({
                ...prev,
                ...data,
                pauseStartTime: data.pauseStartTime
              }));

              // Log NTP timestamp if present
              if (data.ntpTimestamp) {
                addDebugLog('NTP', 'Timestamp received via WebSocket', {
                  ntpTimestamp: data.ntpTimestamp,
                  serverTime: data.serverTime,
                  localTime: Date.now() + clockState.ntpOffset,
                  timeDiff: data.ntpTimestamp - (Date.now() + clockState.ntpOffset)
                });
              }

              // Sync UI with server settings on connection
              if (typeof data.betweenRoundsEnabled === 'boolean') {
                setBetweenRoundsEnabled(data.betweenRoundsEnabled);
              }
              if (typeof data.betweenRoundsTime === 'number') {
                setBetweenRoundsTime(data.betweenRoundsTime);
              }
              if (data.initialTime) {
                setInitialTime(data.initialTime);
                // Mark that these changes come from server to prevent sync loop
                syncFromServerRef.current = true;
                setInputMinutes(data.initialTime.minutes);
                setInputSeconds(data.initialTime.seconds);
                addDebugLog('UI', 'Initial time synced from server', data.initialTime);
              }
              if (typeof data.totalRounds === 'number') {
                setInputRounds(data.totalRounds);
              }
            } else if (data.type === 'clients') {
              setConnectedClients(data.clients || []);
              addDebugLog('WEBSOCKET', 'Connected clients updated', { count: data.clients?.length || 0 });
            } else if (data.type === 'clock_status_visitors') {
              setClockStatusVisitors(data.visitors || []);
            } else if (data.type === 'request-hostname') {
              ws.send(
                JSON.stringify({
                  type: 'client-hostname',
                  hostname: window.location.hostname
                })
              );
            } else {
              handleExternalCommand(data);
            }
          } catch (error) {
            console.error('Invalid WebSocket message:', error);
            addDebugLog('WEBSOCKET', 'Invalid message', { error });
          }
        };

        ws.onerror = (error) => {
          console.log('WebSocket connection failed:', error);
          addDebugLog('WEBSOCKET', 'Connection failed', { error });
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed, attempting to reconnect...');
          addDebugLog('WEBSOCKET', 'Connection closed, reconnecting');
          setTimeout(connectWebSocket, 2000);
        };

        return () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (error) {
        console.log('WebSocket not available:', error);
        addDebugLog('WEBSOCKET', 'Not available', { error: error.message });
      }
    };

    connectWebSocket();
  }, []);

  // NTP Sync Management
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ntpSyncEnabled) {
      const config = {
        ...DEFAULT_NTP_CONFIG,
        syncInterval: ntpSyncInterval,
        driftThreshold: ntpDriftThreshold
      };
      
      ntpManagerRef.current = new NTPSyncManager(config);
      ntpManagerRef.current.setCallbacks(
        (data) => {
          setNtpSyncStatus(prev => ({
            ...prev,
            lastSync: data.timestamp,
            timeOffset: data.offset,
            healthy: true,
            syncCount: prev.syncCount + 1
          }));
          addDebugLog('NTP', 'Time synchronized', {
            server: data.server,
            offset: data.offset,
            timestamp: data.timestamp
          });
        },
        (error) => {
          setNtpSyncStatus(prev => ({
            ...prev,
            healthy: false,
            errorCount: prev.errorCount + 1
          }));
          addDebugLog('NTP', 'Sync error', { error });
        }
      );
      
      ntpManagerRef.current.startSync();
      setNtpSyncStatus(prev => ({ ...prev, enabled: true }));
      
      return () => {
        if (ntpManagerRef.current) {
          ntpManagerRef.current.stopSync();
          ntpManagerRef.current = null;
        }
        setNtpSyncStatus(prev => ({ ...prev, enabled: false }));
      };
    } else {
      if (ntpManagerRef.current) {
        ntpManagerRef.current.stopSync();
        ntpManagerRef.current = null;
      }
      setNtpSyncStatus(prev => ({ ...prev, enabled: false }));
    }
  }, [ntpSyncEnabled, ntpSyncInterval, ntpDriftThreshold]);

  // Load audio sources when paths change
  useEffect(() => {
    warningAudioRef.current = warningAudioPath ? new Audio(warningAudioPath) : null;
  }, [warningAudioPath]);

  useEffect(() => {
    endAudioRef.current = endAudioPath ? new Audio(endAudioPath) : null;
  }, [endAudioPath]);

  const playAudio = async (
    ref: React.RefObject<HTMLAudioElement | null>,
    successKey: string,
    failKey: string,
    alertType: string
  ) => {
    if (!ref.current || audioAlertsPlayedThisRound.has(alertType)) return;
    try {
      await ref.current.play();
      setAudioAlertStatus(successKey);
      addDebugLog('ALERTS', `${alertType} sound played`);
      setAudioAlertsPlayedThisRound(prev => new Set([...prev, alertType]));
    } catch {
      setAudioAlertStatus(failKey);
      addDebugLog('ALERTS', `${alertType} sound failed`);
      setAudioAlertsPlayedThisRound(prev => new Set([...prev, alertType]));
    }
  };

  // Clear audio alerts when round changes or timer resets
  const clearAudioAlerts = () => {
    setAudioAlertStatus(null);
    setAudioAlertsPlayedThisRound(new Set());
  };

  // Play warning and end sounds at specific times
  useEffect(() => {
    if (
      clockState.isRunning &&
      !clockState.isPaused &&
      !clockState.isBetweenRounds
    ) {
      // Play warning sound at 11 seconds remaining
      if (
        clockState.minutes === 0 &&
        clockState.seconds === 11 &&
        warningAudioRef.current
      ) {
        playAudio(warningAudioRef, 'warning-success', 'warning-fail', 'warning');
      }
      // Play end sound at 1 second remaining
      if (
        clockState.minutes === 0 &&
        clockState.seconds === 1 &&
        endAudioRef.current
      ) {
        playAudio(endAudioRef, 'end-success', 'end-fail', 'end');
      }
    }
  }, [clockState.minutes, clockState.seconds, clockState.isRunning, clockState.isPaused, clockState.isBetweenRounds, audioAlertsPlayedThisRound]);

  const handleExternalCommand = (command: any) => {
    addDebugLog('API', 'External command received', command);
    switch (command.action) {
      case 'start':
        toast({ title: "Timer Started" });
        break;
      case 'pause':
        toast({ title: clockState.isPaused ? "Timer Resumed" : "Timer Paused" });
        break;
      case 'reset':
        toast({ title: 'Timer Reset' });
        clearAudioAlerts();
        break;
      case 'reset-time':
        toast({ title: 'Time Reset' });
        clearAudioAlerts();
        break;
      case 'reset-rounds':
        toast({ title: 'Rounds Reset' });
        clearAudioAlerts();
        break;
      case 'set-time':
        setInitialTime({ minutes: command.minutes, seconds: command.seconds });
        setClockState(prev => ({
          ...prev,
          minutes: command.minutes,
          seconds: command.seconds
        }));
        toast({ title: 'Time Set' });
        clearAudioAlerts();
        break;
      case 'next-round':
        toast({ title: `Round ${clockState.currentRound + 1} Started` });
        clearAudioAlerts();
        break;
      case 'previous-round':
        toast({ title: `Round ${clockState.currentRound - 1} Started` });
        clearAudioAlerts();
        break;
      case 'adjust-time':
        break;
    }
  };

  const startTimer = async () => {
    try {
      const response = await fetch('/api/start', { method: 'POST' });
      if (response.ok) {
        addDebugLog('UI', 'Timer started via API');
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to start timer', { error: error.message });
    }
  };

  const pauseTimer = async () => {
    try {
      const response = await fetch('/api/pause', { method: 'POST' });
      if (response.ok) {
        addDebugLog('UI', 'Timer paused/resumed via API');
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to pause/resume timer', { error: error.message });
    }
  };

  const togglePlayPause = () => {
    if (!clockState.isRunning || clockState.isPaused) {
      startTimer();
    } else {
      pauseTimer();
    }
  };

  const resetTime = async () => {
    try {
      // First sync current settings to server
      await syncTimeToServer(inputMinutes, inputSeconds, true);
      
      const response = await fetch('/api/reset-time', { method: 'POST' });
      if (response.ok) {
        addDebugLog('UI', 'Time reset via API with current settings', { 
          minutes: inputMinutes, 
          seconds: inputSeconds 
        });
        clearAudioAlerts();
        // Immediately set local state to ensure neutral grey color
        setClockState(prev => ({
          ...prev,
          isRunning: false,
          isPaused: false,
          minutes: inputMinutes,
          seconds: inputSeconds
        }));
        toast({ title: `Time reset to ${inputMinutes}:${inputSeconds.toString().padStart(2, '0')}` });
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to reset time', { error: error.message });
    }
  };

  const resetRounds = async () => {
    try {
      // First sync current settings to server
      await syncTimeToServer(inputMinutes, inputSeconds, true);
      
      const response = await fetch('/api/reset-rounds', { method: 'POST' });
      if (response.ok) {
        addDebugLog('UI', 'Rounds reset via API with current settings', {
          minutes: inputMinutes,
          seconds: inputSeconds,
          rounds: inputRounds
        });
        clearAudioAlerts();
        // Immediately set local state to ensure neutral grey color
        setClockState(prev => ({
          ...prev,
          isRunning: false,
          isPaused: false,
          currentRound: 1,
          minutes: inputMinutes,
          seconds: inputSeconds,
          elapsedMinutes: 0,
          elapsedSeconds: 0,
          isBetweenRounds: false
        }));
        toast({ title: `Reset to Round 1 with ${inputMinutes}:${inputSeconds.toString().padStart(2, '0')}` });
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to reset rounds', { error: error.message });
    }
  };

  const resetTimer = () => {
    resetRounds();
  };

  const nextRound = async () => {
    if (clockState.currentRound < clockState.totalRounds) {
      try {
        // Ensure server initial time matches current timer settings
        await syncTimeToServer(inputMinutes, inputSeconds, true);

        const response = await fetch('/api/next-round', { method: 'POST' });
        if (response.ok) {
          addDebugLog('UI', 'Next round via API', {
            round: clockState.currentRound + 1,
            timeSettings: { minutes: inputMinutes, seconds: inputSeconds }
          });
          clearAudioAlerts();
        }
      } catch (error) {
        addDebugLog('UI', 'Failed to advance round', { error: error.message });
      }

      const newRound = clockState.currentRound + 1;
      setInitialTime({ minutes: inputMinutes, seconds: inputSeconds });
      setClockState(prev => ({
        ...prev,
        currentRound: newRound,
        minutes: inputMinutes,
        seconds: inputSeconds,
        isRunning: false,
        isPaused: false,
        elapsedMinutes: 0,
        elapsedSeconds: 0,
        isBetweenRounds: false
      }));
    }
  };

  const previousRound = () => {
    if (clockState.currentRound > 1) {
      const newRound = clockState.currentRound - 1;
      setClockState(prev => ({
        ...prev,
        currentRound: newRound,
        minutes: inputMinutes,
        seconds: inputSeconds,
        isRunning: false,
        isPaused: false,
        elapsedMinutes: 0,
        elapsedSeconds: 0,
        isBetweenRounds: false
      }));
      addDebugLog('UI', 'Previous round', { 
        round: newRound,
        timeSettings: { minutes: inputMinutes, seconds: inputSeconds }
      });
      clearAudioAlerts();
    }
  };

  const adjustTimeBySeconds = async (secondsToAdd: number) => {
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
      addDebugLog('UI', 'Failed to adjust time', { error: error.message });
    }
  };

  const setTime = async (minutes: number, seconds: number) => {
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
        clearAudioAlerts();
      }
    } catch (error) {
      addDebugLog('UI', 'Failed to set time', { error: error.message });
    }
  };

  const setRounds = async (rounds: number) => {
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
      addDebugLog('UI', 'Failed to set rounds', { error: error.message });
    }
  };

  const applySettings = async () => {
    addDebugLog('UI', 'Settings applied', { 
      time: { minutes: inputMinutes, seconds: inputSeconds },
      rounds: inputRounds,
      betweenRoundsEnabled,
      betweenRoundsTime,
      ntpSyncEnabled,
      ntpSyncInterval,
      ntpDriftThreshold
    });
    
    await setTime(inputMinutes, inputSeconds);
    await setRounds(inputRounds);
    
    try {
      await fetch('/api/set-between-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: betweenRoundsEnabled, time: betweenRoundsTime })
      });
      
      await fetch('/api/set-ntp-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: ntpSyncEnabled, 
          interval: ntpSyncInterval,
          driftThreshold: ntpDriftThreshold
        })
      });
    } catch (error) {
      addDebugLog('UI', 'Failed to sync settings with server', { error: error.message });
    }

if (warningAudioFile) {
  const data = new FormData();
  data.append('audio', warningAudioFile);
  try {
    const res = await fetch('/api/upload-audio/warning', {
      method: 'POST',
      body: data
    });
    if (res.ok) {
      const json = await res.json();
      setWarningAudioPath(json.path);
      if (typeof window !== 'undefined') {
        localStorage.setItem('warningSoundPath', json.path);
      }
    }
  } catch {
    // ignore
  }
}

if (endAudioFile) {
  const data = new FormData();
  data.append('audio', endAudioFile);
  try {
    const res = await fetch('/api/upload-audio/end', {
      method: 'POST',
      body: data
    });
    if (res.ok) {
      const json = await res.json();
      setEndAudioPath(json.path);
      if (typeof window !== 'undefined') {
        localStorage.setItem('endSoundPath', json.path);
      }
    }
  } catch {
    // ignore
  }
  
    }

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
        <TabsList className="grid w-full grid-cols-5 mb-0 bg-gray-800 border-gray-700">
          <TabsTrigger value="clock" className="text-lg py-3 data-[state=active]:bg-gray-600">Clock</TabsTrigger>
          <TabsTrigger value="settings" className="text-lg py-3 data-[state=active]:bg-gray-600">
            <Settings className="w-5 h-5 mr-2" />
            Settings
            {!settingsSynced && <span className="ml-1 w-2 h-2 bg-yellow-500 rounded-full"></span>}
          </TabsTrigger>
          <TabsTrigger value="info" className="text-lg py-3 data-[state=active]:bg-gray-600">
            <Info className="w-5 h-5 mr-2" />
            Info
          </TabsTrigger>
          <TabsTrigger value="api" className="text-lg py-3 data-[state=active]:bg-gray-600">
            <Server className="w-5 h-5 mr-2" />
            API Info
          </TabsTrigger>
          <TabsTrigger value="debug" className="text-lg py-3 data-[state=active]:bg-gray-600">
            <Bug className="w-5 h-5 mr-2" />
            Debug
          </TabsTrigger>
        </TabsList>

        {/* Show FloatingClock bar on non-clock tabs */}
        {activeTab !== 'clock' && (
          <FloatingClock 
            clockState={clockState} 
            ntpSyncStatus={ntpSyncStatus}
          />
        )}

        <TabsContent value="clock" className="space-y-4">
          <ClockDisplay
            clockState={clockState}
            ipAddress={ipAddress}
            betweenRoundsEnabled={betweenRoundsEnabled}
            betweenRoundsTime={betweenRoundsTime}
            ntpSyncStatus={ntpSyncStatus}
            audioAlertStatus={audioAlertStatus}
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
            ntpSyncEnabled={ntpSyncEnabled}
            ntpSyncInterval={ntpSyncInterval}
            ntpDriftThreshold={ntpDriftThreshold}
            warningSoundPath={warningAudioPath}
            endSoundPath={endAudioPath}
            setWarningSoundFile={setWarningAudioFile}
            setEndSoundFile={setEndAudioFile}
            setInputMinutes={setInputMinutes}
            setInputSeconds={setInputSeconds}
            setInputRounds={setInputRounds}
            setBetweenRoundsEnabled={setBetweenRoundsEnabled}
            setBetweenRoundsTime={setBetweenRoundsTime}
            setNtpSyncEnabled={setNtpSyncEnabled}
            setNtpSyncInterval={setNtpSyncInterval}
            setNtpDriftThreshold={setNtpDriftThreshold}
            setWarningSoundPath={setWarningAudioPath}
            setEndSoundPath={setEndAudioPath}
            onApplySettings={applySettings}
          />
        </TabsContent>

        <TabsContent value="info">
          <InfoTab />
        </TabsContent>

        <TabsContent value="api">
          <ApiInfoTab
            ipAddress={ipAddress}
            onCommandCopy={handleCommandCopy}
          />
        </TabsContent>

        <TabsContent value="debug">
          <DebugTab
            {...debugLogProps}
            onClearDebugLog={debugLogProps.clearDebugLog}
            connectedClients={connectedClients}
            ntpSyncStatus={ntpSyncStatus}
            clockStatusVisitors={clockStatusVisitors}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CountdownClock;
