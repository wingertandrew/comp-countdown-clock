
import { useRef, useEffect } from 'react';
import { ClockState } from '@/types/clock';
import { useDebugLog } from './useDebugLog';

interface UseWebSocketProps {
  clockState: ClockState;
  initialTime: { minutes: number; seconds: number };
  inputRounds: number;
  betweenRoundsEnabled: boolean;
  betweenRoundsTime: number;
  ntpSyncEnabled: boolean;
  ntpSyncInterval: number;
  ntpDriftThreshold: number;
  setClockState: React.Dispatch<React.SetStateAction<ClockState>>;
  setBetweenRoundsEnabled: (enabled: boolean) => void;
  setBetweenRoundsTime: (time: number) => void;
  setInitialTime: React.Dispatch<React.SetStateAction<{ minutes: number; seconds: number }>>;
  setConnectedClients: React.Dispatch<React.SetStateAction<any[]>>;
  onExternalCommand: (command: any) => void;
}

export const useWebSocket = ({
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
  onExternalCommand
}: UseWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const { addDebugLog } = useDebugLog();

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

              if (data.ntpTimestamp) {
                addDebugLog('NTP', 'Timestamp received via WebSocket', {
                  ntpTimestamp: data.ntpTimestamp,
                  serverTime: data.serverTime,
                  localTime: Date.now() + clockState.ntpOffset,
                  timeDiff: data.ntpTimestamp - (Date.now() + clockState.ntpOffset)
                });
              }

              if (typeof data.betweenRoundsEnabled === 'boolean') {
                setBetweenRoundsEnabled(data.betweenRoundsEnabled);
              }
              if (typeof data.betweenRoundsTime === 'number') {
                setBetweenRoundsTime(data.betweenRoundsTime);
              }
              
              if (data.initialTime) {
                setInitialTime(data.initialTime);
              }
            } else if (data.type === 'clients') {
              setConnectedClients(data.clients || []);
              addDebugLog('WEBSOCKET', 'Connected clients updated', { count: data.clients?.length || 0 });
            } else if (data.type === 'request-hostname') {
              ws.send(
                JSON.stringify({
                  type: 'client-hostname',
                  hostname: window.location.hostname
                })
              );
            } else {
              onExternalCommand(data);
            }
          } catch (error) {
            console.error('Invalid WebSocket message:', error);
            addDebugLog('WEBSOCKET', 'Invalid message', { error });
          }
        };

        ws.onerror = (error) => {
          console.log('WebSocket connection failed:', error);
          addDebugLog('WEBSOCKET', 'Connection failed', { error: error.type || 'Connection error' });
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
        addDebugLog('WEBSOCKET', 'Not available', { error: error instanceof Error ? error.message : String(error) });
      }
    };

    connectWebSocket();
  }, []);

  return wsRef;
};
