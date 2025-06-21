import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RotateCcw, SkipForward, Settings, Info } from 'lucide-react';
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
    elapsedSeconds: 0
  });

  const [initialTime, setInitialTime] = useState({ minutes: 5, seconds: 0 });
  const [inputMinutes, setInputMinutes] = useState(5);
  const [inputSeconds, setInputSeconds] = useState(0);
  const [inputRounds, setInputRounds] = useState(3);
  const [activeTab, setActiveTab] = useState('clock');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // WebSocket for API communication
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Only attempt WebSocket connection in production environment on Raspberry Pi
    // Skip WebSocket in development to avoid security errors
    const isProduction = window.location.protocol === 'http:' || window.location.hostname === 'localhost' || window.location.hostname.includes('raspberrypi');
    
    if (isProduction) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.hostname}:${window.location.port || 8080}/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected for external control');
        };

        ws.onmessage = (event) => {
          try {
            const command = JSON.parse(event.data);
            handleExternalCommand(command);
          } catch (error) {
            console.error('Invalid WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.log('WebSocket connection failed:', error);
        };

        return () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (error) {
        console.log('WebSocket not available in this environment');
      }
    } else {
      console.log('WebSocket disabled in development environment');
    }
  }, []);

  const handleExternalCommand = (command: any) => {
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
      wsRef.current.send(JSON.stringify({
        type: 'status',
        ...clockState,
        totalTime: initialTime
      }));
    }
  };

  useEffect(() => {
    if (clockState.isRunning && !clockState.isPaused) {
      intervalRef.current = setInterval(() => {
        setClockState(prev => {
          const newSeconds = prev.seconds - 1;
          const newMinutes = newSeconds < 0 ? prev.minutes - 1 : prev.minutes;
          const adjustedSeconds = newSeconds < 0 ? 59 : newSeconds;

          // Update elapsed time
          const totalElapsed = (initialTime.minutes * 60 + initialTime.seconds) - (newMinutes * 60 + adjustedSeconds);
          const elapsedMinutes = Math.floor(totalElapsed / 60);
          const elapsedSeconds = totalElapsed % 60;

          if (newMinutes < 0) {
            // Round completed
            if (prev.currentRound < prev.totalRounds) {
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
              // All rounds completed
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
    setClockState(prev => ({ ...prev, isRunning: true, isPaused: false }));
    toast({ title: "Timer Started" });
  };

  const pauseTimer = () => {
    setClockState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    toast({ title: clockState.isPaused ? "Timer Resumed" : "Timer Paused" });
  };

  const resetTimer = () => {
    setClockState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      minutes: initialTime.minutes,
      seconds: initialTime.seconds,
      currentRound: 1,
      elapsedMinutes: 0,
      elapsedSeconds: 0
    }));
    toast({ title: "Timer Reset" });
  };

  const nextRound = () => {
    if (clockState.currentRound < clockState.totalRounds) {
      setClockState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        minutes: initialTime.minutes,
        seconds: initialTime.seconds,
        elapsedMinutes: 0,
        elapsedSeconds: 0
      }));
      toast({ title: `Round ${clockState.currentRound + 1} Started` });
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
      elapsedSeconds: 0
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
    setTime(inputMinutes, inputSeconds);
    setRounds(inputRounds);
    setActiveTab('clock');
    toast({ title: "Settings Applied" });
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="clock" className="text-lg py-3">Clock</TabsTrigger>
          <TabsTrigger value="settings" className="text-lg py-3">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="info" className="text-lg py-3">
            <Info className="w-5 h-5 mr-2" />
            API Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clock" className="space-y-6">
          {/* Main Timer Display */}
          <Card className="bg-black/50 border-slate-700">
            <CardContent className="p-8 text-center">
              <div className="text-9xl md:text-[12rem] font-mono font-bold tracking-wider mb-4 text-green-400">
                {formatTime(clockState.minutes, clockState.seconds)}
              </div>
              <div className="text-2xl text-slate-300 mb-4">
                Round {clockState.currentRound} of {clockState.totalRounds}
              </div>
              <div className="text-lg text-slate-400">
                Elapsed: {formatTime(clockState.elapsedMinutes, clockState.elapsedSeconds)}
              </div>
            </CardContent>
          </Card>

          {/* Control Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={startTimer}
              disabled={clockState.isRunning && !clockState.isPaused}
              size="lg"
              className="h-20 text-xl bg-green-600 hover:bg-green-700"
            >
              <Play className="w-8 h-8 mr-2" />
              Start
            </Button>
            
            <Button
              onClick={pauseTimer}
              disabled={!clockState.isRunning}
              size="lg"
              className="h-20 text-xl bg-yellow-600 hover:bg-yellow-700"
            >
              <Pause className="w-8 h-8 mr-2" />
              {clockState.isPaused ? 'Resume' : 'Pause'}
            </Button>
            
            <Button
              onClick={resetTimer}
              size="lg"
              className="h-20 text-xl bg-red-600 hover:bg-red-700"
            >
              <RotateCcw className="w-8 h-8 mr-2" />
              Reset
            </Button>
            
            <Button
              onClick={nextRound}
              disabled={clockState.currentRound >= clockState.totalRounds}
              size="lg"
              className="h-20 text-xl bg-blue-600 hover:bg-blue-700"
            >
              <SkipForward className="w-8 h-8 mr-2" />
              Next Round
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-black/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-2xl">Timer Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-lg font-medium mb-2">Minutes</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={inputMinutes}
                    onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                    className="text-xl h-14 bg-slate-800 border-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-lg font-medium mb-2">Seconds</label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={inputSeconds}
                    onChange={(e) => setInputSeconds(parseInt(e.target.value) || 0)}
                    className="text-xl h-14 bg-slate-800 border-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-lg font-medium mb-2">Rounds (1-15)</label>
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    value={inputRounds}
                    onChange={(e) => setInputRounds(parseInt(e.target.value) || 1)}
                    className="text-xl h-14 bg-slate-800 border-slate-600"
                  />
                </div>
              </div>
              
              <Button
                onClick={applySettings}
                size="lg"
                className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
              >
                Apply Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <Card className="bg-black/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-2xl">HTTP API Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-lg text-slate-300 mb-6">
                Base URL: <code className="bg-slate-800 px-2 py-1 rounded">http://&lt;raspberry-pi-ip&gt;:8080/api</code>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-green-400 mb-2">Timer Controls</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-slate-800 p-3 rounded">
                      <code className="text-green-300">POST /start</code>
                      <p className="text-slate-300 mt-1">Start the countdown timer</p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded">
                      <code className="text-yellow-300">POST /pause</code>
                      <p className="text-slate-300 mt-1">Pause/Resume the timer</p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded">
                      <code className="text-red-300">POST /reset</code>
                      <p className="text-slate-300 mt-1">Reset timer to initial settings</p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded">
                      <code className="text-blue-300">POST /next-round</code>
                      <p className="text-slate-300 mt-1">Skip to next round</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-400 mb-2">Configuration</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-slate-800 p-3 rounded">
                      <code className="text-purple-300">POST /set-time</code>
                      <p className="text-slate-300 mt-1">Body: <code>{"{"}"minutes": 5, "seconds": 30{"}"}</code></p>
                    </div>
                    <div className="bg-slate-800 p-3 rounded">
                      <code className="text-purple-300">POST /set-rounds</code>
                      <p className="text-slate-300 mt-1">Body: <code>{"{"}"rounds": 10{"}"}</code></p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-cyan-400 mb-2">Status</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-slate-800 p-3 rounded">
                      <code className="text-cyan-300">GET /status</code>
                      <p className="text-slate-300 mt-1">Get current timer state and settings</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-orange-400 mb-2">Stream Deck Integration</h3>
                  <div className="bg-slate-800 p-4 rounded text-sm">
                    <p className="text-slate-300 mb-2">For Stream Deck with Companion:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>Use HTTP Request actions</li>
                      <li>Set method to POST for controls</li>
                      <li>Use GET for status checks</li>
                      <li>Configure with your Pi's IP address</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CountdownClock;
