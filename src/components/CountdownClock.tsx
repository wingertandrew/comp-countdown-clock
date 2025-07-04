import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Info, Bug, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClockState, NTPSyncStatus, NTPSyncRecord, SessionReport } from '@/types/clock';
import { useDebugLog } from '@/hooks/useDebugLog';
import { useSessionTracking } from '@/hooks/useSessionTracking';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNTPSync } from '@/hooks/useNTPSync';
import { useClockControls } from '@/hooks/useClockControls';

import ClockDisplay from './ClockDisplay';
import SettingsTab from './SettingsTab';
import ApiInfoTab from './ApiInfoTab';
import DebugTab from './DebugTab';
import ClockReportTab from './ClockReportTab';
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
    ntpSyncInterval: 21600000,
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
  const [ntpSyncInterval, setNtpSyncInterval] = useState(21600000);
  const [ntpDriftThreshold, setNtpDriftThreshold] = useState(50);
  const [ntpSyncStatus, setNtpSyncStatus] = useState<NTPSyncStatus>({
    enabled: false,
    lastSync: 0,
    timeOffset: 0,
    healthy: false,
    syncCount: 0,
    errorCount: 0
  });
  const [ntpSyncHistory, setNtpSyncHistory] = useState<NTPSyncRecord[]>([]);
  const [activeTab, setActiveTab] = useState('clock');
  const [ipAddress, setIpAddress] = useState('');
  const [connectedClients, setConnectedClients] = useState<any[]>([]);
  const [sessionReport, setSessionReport] = useState<SessionReport | null>(null);

  const { toast } = useToast();
  const { addDebugLog, ...debugLogProps } = useDebugLog();
  const { generateReport, resetSession, currentReport } = useSessionTracking(clockState);

  useEffect(() => {
    setIpAddress(window.location.hostname || 'localhost');
  }, []);

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
        resetSession();
        break;
      case 'reset-time':
        toast({ title: 'Time Reset' });
        break;
      case 'reset-rounds':
        toast({ title: 'Rounds Reset' });
        resetSession();
        break;
      case 'set-time':
        setInitialTime({ minutes: command.minutes, seconds: command.seconds });
        setClockState(prev => ({
          ...prev,
          minutes: command.minutes,
          seconds: command.seconds
        }));
        toast({ title: 'Time Set' });
        break;
      case 'next-round':
        toast({ title: `Round ${clockState.currentRound + 1} Started` });
        break;
      case 'previous-round':
        toast({ title: `Round ${clockState.currentRound - 1} Started` });
        break;
      case 'adjust-time':
        break;
    }
  };

  useWebSocket({
    clockState,
    initialTime,
    inputRounds,
    betweenRoundsEnabled,
    betweenRoundsTime,
    ntpSyncEnabled,
    ntpSyncInterval,
    ntpDriftThreshold,
    setClockState,
    setBetweenRoundsEnabled,
    setBetweenRoundsTime,
    setInitialTime,
    setConnectedClients,
    onExternalCommand: handleExternalCommand
  });

  useNTPSync({
    ntpSyncEnabled,
    ntpSyncInterval,
    ntpDriftThreshold,
    setNtpSyncStatus,
    setNtpSyncHistory
  });

  const {
    togglePlayPause,
    resetTime,
    resetRounds,
    nextRound,
    previousRound,
    adjustTimeBySeconds,
    setTime,
    setRounds
  } = useClockControls({
    clockState,
    initialTime,
    setClockState,
    setInitialTime,
    resetSession
  });

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
      addDebugLog('UI', 'Failed to sync settings with server', { error: error instanceof Error ? error.message : String(error) });
    }
    
    setActiveTab('clock');
    toast({ title: "Settings Applied" });
  };

  const handleGenerateReport = () => {
    const report = generateReport();
    setSessionReport(report);
    setActiveTab('report');
    toast({ title: "Report Generated" });
  };

  const handleExportReport = (format: 'pdf' | 'csv' | 'png') => {
    const reportToExport = currentReport || sessionReport;
    if (!reportToExport) return;
    
    toast({ title: `Report exported as ${format.toUpperCase()}`, description: `Session ${reportToExport.sessionId}` });
    addDebugLog('UI', 'Report exported', { format, sessionId: reportToExport.sessionId });
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
          </TabsTrigger>
          <TabsTrigger value="report" className="text-lg py-3 data-[state=active]:bg-gray-600">
            <FileText className="w-5 h-5 mr-2" />
            Report
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
            onTogglePlayPause={togglePlayPause}
            onNextRound={nextRound}
            onPreviousRound={previousRound}
            onResetTime={resetTime}
            onResetRounds={resetRounds}
            onAdjustTimeBySeconds={adjustTimeBySeconds}
            onGenerateReport={handleGenerateReport}
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
            ntpSyncHistory={ntpSyncHistory}
            setInputMinutes={setInputMinutes}
            setInputSeconds={setInputSeconds}
            setInputRounds={setInputRounds}
            setBetweenRoundsEnabled={setBetweenRoundsEnabled}
            setBetweenRoundsTime={setBetweenRoundsTime}
            setNtpSyncEnabled={setNtpSyncEnabled}
            setNtpSyncInterval={setNtpSyncInterval}
            setNtpDriftThreshold={setNtpDriftThreshold}
            onApplySettings={applySettings}
          />
        </TabsContent>

        <TabsContent value="report">
          <ClockReportTab
            sessionReport={currentReport || sessionReport}
            onGenerateReport={handleGenerateReport}
            onExportReport={handleExportReport}
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
            connectedClients={connectedClients}
            ntpSyncStatus={ntpSyncStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CountdownClock;
