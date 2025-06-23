
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DebugLogEntry, DebugFilter } from '@/types/clock';

interface DebugTabProps {
  debugLog: DebugLogEntry[];
  debugFilter: DebugFilter;
  setDebugFilter: (filter: DebugFilter) => void;
  onClearDebugLog: () => void;
  filteredDebugLog: DebugLogEntry[];
}

const DebugTab: React.FC<DebugTabProps> = ({
  debugLog,
  debugFilter,
  setDebugFilter,
  onClearDebugLog,
  filteredDebugLog
}) => {
  return (
    <div className="space-y-6 p-4 min-h-screen bg-gray-900">
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
              onClick={onClearDebugLog}
              className="text-lg h-12 px-6 text-white bg-red-600 hover:bg-red-700 ml-4"
            >
              Clear Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[75vh] overflow-y-auto space-y-3">
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
    </div>
  );
};

export default DebugTab;
