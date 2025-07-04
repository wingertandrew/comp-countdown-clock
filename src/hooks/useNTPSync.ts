
import { useRef, useEffect } from 'react';
import { NTPSyncStatus, NTPSyncRecord } from '@/types/clock';
import { useDebugLog } from './useDebugLog';
import { NTPSyncManager, DEFAULT_NTP_CONFIG } from '@/utils/ntpSync';

interface UseNTPSyncProps {
  ntpSyncEnabled: boolean;
  ntpSyncInterval: number;
  ntpDriftThreshold: number;
  setNtpSyncStatus: React.Dispatch<React.SetStateAction<NTPSyncStatus>>;
  setNtpSyncHistory: React.Dispatch<React.SetStateAction<NTPSyncRecord[]>>;
}

export const useNTPSync = ({
  ntpSyncEnabled,
  ntpSyncInterval,
  ntpDriftThreshold,
  setNtpSyncStatus,
  setNtpSyncHistory
}: UseNTPSyncProps) => {
  const ntpManagerRef = useRef<NTPSyncManager | null>(null);
  const { addDebugLog } = useDebugLog();

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
          const syncRecord: NTPSyncRecord = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: data.timestamp,
            server: data.server,
            offset: data.offset,
            success: true
          };
          
          setNtpSyncHistory(prev => [...prev, syncRecord]);
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
        (error: any) => {
          const syncRecord: NTPSyncRecord = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            server: 'unknown',
            offset: 0,
            success: false,
            error: error && typeof error === 'object' && 'message' in error ? error.message : String(error)
          };
          
          setNtpSyncHistory(prev => [...prev, syncRecord]);
          setNtpSyncStatus(prev => ({
            ...prev,
            healthy: false,
            errorCount: prev.errorCount + 1
          }));
          addDebugLog('NTP', 'Sync error', { error: String(error) });
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

  return ntpManagerRef;
};
