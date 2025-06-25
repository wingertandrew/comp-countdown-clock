
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Plus, Minus, Wifi, WifiOff } from 'lucide-react';

interface SettingsTabProps {
  inputMinutes: number;
  inputSeconds: number;
  inputRounds: number;
  ntpOffset: number;
  ntpServer: string;
  lastNtpSync: string;
  ntpDrift: number;
  setInputMinutes: (value: number) => void;
  setInputSeconds: (value: number) => void;
  setInputRounds: (value: number) => void;
  onApplySettings: () => void;
  onSyncWithNTP: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  inputMinutes,
  inputSeconds,
  inputRounds,
  ntpOffset,
  ntpServer,
  lastNtpSync,
  ntpDrift,
  setInputMinutes,
  setInputSeconds,
  setInputRounds,
  onApplySettings,
  onSyncWithNTP
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
              <Input
                type="number"
                min="0"
                max="59"
                value={inputMinutes}
                onChange={(e) => setInputMinutes(parseInt(e.target.value) || 0)}
                className="h-32 bg-gray-700 border-gray-500 text-center text-white text-8xl font-bold rounded-xl"
              />
              <div className="flex gap-6 mt-6">
                <Button
                  onClick={() => setInputMinutes(Math.max(0, inputMinutes - 1))}
                  size="lg"
                  className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
                >
                  <Minus className="w-12 h-12" />
                </Button>
                <Button
                  onClick={() => setInputMinutes(Math.min(59, inputMinutes + 1))}
                  size="lg"
                  className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
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
                className="h-32 bg-gray-700 border-gray-500 text-center text-white text-8xl font-bold rounded-xl"
              />
              <div className="flex gap-6 mt-6">
                <Button
                  onClick={() => setInputSeconds(Math.max(0, inputSeconds - 1))}
                  size="lg"
                  className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
                >
                  <Minus className="w-12 h-12" />
                </Button>
                <Button
                  onClick={() => setInputSeconds(Math.min(59, inputSeconds + 1))}
                  size="lg"
                  className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
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
                className="h-32 bg-gray-700 border-gray-500 text-center text-white text-8xl font-bold rounded-xl"
              />
              <div className="flex gap-6 mt-6">
                <Button
                  onClick={() => setInputRounds(Math.max(1, inputRounds - 1))}
                  size="lg"
                  className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
                >
                  <Minus className="w-12 h-12" />
                </Button>
                <Button
                  onClick={() => setInputRounds(Math.min(15, inputRounds + 1))}
                  size="lg"
                  className="h-24 w-24 text-6xl bg-gray-400 hover:bg-gray-300 text-black rounded-xl"
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
                    onClick={onSyncWithNTP}
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
