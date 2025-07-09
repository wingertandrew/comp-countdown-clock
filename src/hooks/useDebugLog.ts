
import { useState } from 'react';
import { DebugLogEntry, DebugFilter } from '@/types/clock';

export const useDebugLog = () => {
  const [debugLog, setDebugLog] = useState<DebugLogEntry[]>([]);
  const [debugFilter, setDebugFilter] = useState<DebugFilter>('ALL');

  const addDebugLog = (
    source: 'UI' | 'API' | 'WEBSOCKET' | 'NTP' | 'ALERTS',
    action: string,
    details?: any
  ) => {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      source,
      action,
      details
    };
    setDebugLog(prev => [entry, ...prev].slice(0, 100)); // Keep last 100 entries
  };

  const clearDebugLog = () => setDebugLog([]);

  const filteredDebugLog = debugLog.filter(entry => 
    debugFilter === 'ALL' || entry.source === debugFilter
  );

  return {
    debugLog,
    debugFilter,
    setDebugFilter,
    addDebugLog,
    clearDebugLog,
    filteredDebugLog
  };
};
