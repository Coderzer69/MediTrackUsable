import { createContext, useContext, type ReactNode } from 'react';
import { useLiveSync, type LiveSyncState } from '../lib/liveSync';

const LiveSyncContext = createContext<LiveSyncState>({ version: 0, status: 'connecting', lastSynced: null });

// One poller for the whole admin layout; every page reads its `version`.
export const LiveSyncProvider = ({ children }: { children: ReactNode }) => {
  const state = useLiveSync();
  return <LiveSyncContext.Provider value={state}>{children}</LiveSyncContext.Provider>;
};

export const useLiveSyncState = () => useContext(LiveSyncContext);
