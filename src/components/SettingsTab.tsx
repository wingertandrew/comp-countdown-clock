
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Clock, Plus, Minus, Wifi, Server } from 'lucide-react';

interface SettingsTabProps {
  inputMinutes: number;
  inputSeconds: number;
  inputRounds: number;
  betweenRoundsEnabled: boolean;
  betweenRoundsTime: number;
  ntpSyncEnabled: boolean;
  ntpSyncInterval: number;
  ntpDriftThreshold: number;
  setInputMinutes: (value: number) => void;
  setInputSeconds: (value: number) => void;
  setInputRounds: (value: number) => void;
  setBetweenRoundsEnabled: (enabled: boolean) => void;
  setBetweenRoundsTime: (time: number) => void;
  setNtpSyncEnabled: (enabled: boolean) => void;
  setNtpSyncInterval: (interval: number) => void;
  setNtpDriftThreshold: (threshold: number) => void;
  onApplySettings: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  inputMinutes,
  inputSeconds,
  inputRounds,
  betweenRoundsEnabled,
  betweenRoundsTime,
  ntpSyncEnabled,
  ntpSyncInterval,
  ntpDriftThreshold,
  setInputMinutes,
  setInputSeconds,
  setInputRounds,
  setBetweenRoundsEnabled,
  setBetweenRoundsTime,
  setNtpSyncEnabled,
  setNtpSyncInterval,
  setNtpDriftThreshold,
  onApplySettings
}) => {
  return (
    <div className="space-y-6 p-4 min-h-screen bg-gray-900">
      <Card className="bg-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="text-4xl text-white mb-4">Timer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <label className="block text-3xl font-medium mb-6 text-white">Minutes</label>
              <Input type="number" min="0" max="59" value={inputMinutes} onChange={e => setInputMinutes(Math.max(0, parseInt(e.target.value) || 0))} className="h-32 bg-gray-700 border-gray-500 text-center text-white text-8xl font-bold rounded-2xl" />
              <div className="flex gap-6 mt-6">
                <Button onClick={() => setInputMinutes(Math.max(0, inputMinutes - 1))} size="lg" className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl">
                  <Minus className="w-12 h-12" />
                </Button>
                <Button onClick={() => setInputMinutes(Math.min(59, inputMinutes + 1))} size="lg" className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl">
                  <Plus className="w-12 h-12" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <label className="block text-3xl font-medium mb-6 text-white">Seconds</label>
              <Input type="number" min="0" max="59" value={inputSeconds} onChange={e => setInputSeconds(Math.max(0, parseInt(e.target.value) || 0))} className="h-32 bg-gray-700 border-gray-500 text-center text-white text-8xl font-bold rounded-2xl" />
              <div className="flex gap-6 mt-6">
                <Button onClick={() => setInputSeconds(Math.max(0, inputSeconds - 1))} size="lg" className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl">
                  <Minus className="w-12 h-12" />
                </Button>
                <Button onClick={() => setInputSeconds(Math.min(59, inputSeconds + 1))} size="lg" className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl">
                  <Plus className="w-12 h-12" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <label className="block text-3xl font-medium mb-6 text-white">Rounds (1-15)</label>
              <Input type="number" min="1" max="15" value={inputRounds} onChange={e => setInputRounds(parseInt(e.target.value) || 1)} className="h-32 bg-gray-700 border-gray-500 text-center text-white text-8xl font-bold rounded-2xl" />
              <div className="flex gap-6 mt-6">
                <Button onClick={() => setInputRounds(Math.max(1, inputRounds - 1))} size="lg" className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl">
                  <Minus className="w-12 h-12" />
                </Button>
                <Button onClick={() => setInputRounds(Math.min(15, inputRounds + 1))} size="lg" className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl">
                  <Plus className="w-12 h-12" />
                </Button>
              </div>
            </div>
          </div>

          {/* Between Rounds Settings */}
          <Card className="bg-gray-700 border-gray-500">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-3">
                <Clock className="w-8 h-8" />
                Between Rounds Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl text-white font-semibold">Enable Between Rounds Timer</h3>
                  <p className="text-gray-300 text-lg">
                    Automatically start a count-up timer between rounds
                  </p>
                </div>
                <Switch
                  checked={betweenRoundsEnabled}
                  onCheckedChange={setBetweenRoundsEnabled}
                  className="scale-150"
                />
              </div>
              
              {betweenRoundsEnabled && (
                <div className="flex flex-col items-center space-y-4">
                  <label className="block text-2xl font-medium text-white">
                    Between Rounds Duration (seconds)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    value={betweenRoundsTime}
                    onChange={(e) => setBetweenRoundsTime(parseInt(e.target.value) || 60)}
                    className="h-20 bg-gray-700 border-gray-500 text-center text-white text-4xl font-bold rounded-2xl max-w-xs"
                  />
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setBetweenRoundsTime(Math.max(1, betweenRoundsTime - 15))}
                      size="lg"
                      className="h-16 w-16 text-4xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
                    >
                      <Minus className="w-8 h-8" />
                    </Button>
                    <Button
                      onClick={() => setBetweenRoundsTime(Math.min(300, betweenRoundsTime + 15))}
                      size="lg"
                      className="h-16 w-16 text-4xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
                    >
                      <Plus className="w-8 h-8" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NTP Sync Settings - Always Expanded */}
          <Card className="bg-gray-700 border-gray-500">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-3">
                <Server className="w-8 h-8" />
                Network Time Synchronization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl text-white font-semibold">Enable NTP Time Sync</h3>
                  <p className="text-gray-300 text-lg">
                    Keep all remote clocks perfectly synchronized using Network Time Protocol
                  </p>
                </div>
                <Switch
                  checked={ntpSyncEnabled}
                  onCheckedChange={setNtpSyncEnabled}
                  className="scale-150"
                />
              </div>
              
              {/* Always show NTP configuration - grayed out when disabled */}
              <div className={`space-y-6 ${!ntpSyncEnabled ? 'opacity-50' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col items-center space-y-4">
                    <label className="block text-xl font-medium text-white">
                      Sync Interval (hours)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={ntpSyncInterval / 3600000}
                      onChange={(e) => setNtpSyncInterval((parseInt(e.target.value) || 6) * 3600000)}
                      disabled={!ntpSyncEnabled}
                      className="h-16 bg-gray-700 border-gray-500 text-center text-white text-2xl font-bold rounded-xl max-w-xs disabled:opacity-50"
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setNtpSyncInterval(Math.max(3600000, ntpSyncInterval - 3600000))}
                        size="sm"
                        disabled={!ntpSyncEnabled}
                        className="h-12 w-12 bg-gray-400 hover:bg-gray-300 text-black rounded-lg disabled:opacity-50"
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={() => setNtpSyncInterval(Math.min(86400000, ntpSyncInterval + 3600000))}
                        size="sm"
                        disabled={!ntpSyncEnabled}
                        className="h-12 w-12 bg-gray-400 hover:bg-gray-300 text-black rounded-lg disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-4">
                    <label className="block text-xl font-medium text-white">
                      Drift Threshold (ms)
                    </label>
                    <Input
                      type="number"
                      min="10"
                      max="1000"
                      value={ntpDriftThreshold}
                      onChange={(e) => setNtpDriftThreshold(parseInt(e.target.value) || 50)}
                      disabled={!ntpSyncEnabled}
                      className="h-16 bg-gray-700 border-gray-500 text-center text-white text-2xl font-bold rounded-xl max-w-xs disabled:opacity-50"
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setNtpDriftThreshold(Math.max(10, ntpDriftThreshold - 10))}
                        size="sm"
                        disabled={!ntpSyncEnabled}
                        className="h-12 w-12 bg-gray-400 hover:bg-gray-300 text-black rounded-lg disabled:opacity-50"
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={() => setNtpDriftThreshold(Math.min(1000, ntpDriftThreshold + 10))}
                        size="sm"
                        disabled={!ntpSyncEnabled}
                        className="h-12 w-12 bg-gray-400 hover:bg-gray-300 text-black rounded-lg disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Wifi className="w-6 h-6 text-blue-400" />
                    <h4 className="text-lg font-semibold text-blue-400">Sync Configuration</h4>
                  </div>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>• Uses multiple NTP servers for redundancy</p>
                    <p>• Applies smooth time corrections to avoid jumps</p>
                    <p>• Maintains sync status monitoring and health checks</p>
                    <p>• Fallback to local time if all servers fail</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={onApplySettings}
            size="lg"
            className="w-full h-24 text-3xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
          >
            Apply Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
