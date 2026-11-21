import { useEffect, useRef, useState } from 'react';
import api from './api';

export type LiveSyncStatus = 'connecting' | 'live' | 'offline';

export type LiveSyncState = {
  // Increments every time the database changes. Use it as an effect dependency to reload.
  version: number;
  status: LiveSyncStatus;
  lastSynced: Date | null;
};

// Keeps an admin view in step with the database.
// Polls a cheap fingerprint endpoint while the tab is visible, and bumps
// `version` whenever the data changed - whether the change came from this panel,
// another admin, the patient/doctor apps, or a direct edit in the database.
export function useLiveSync(intervalMs = 5000): LiveSyncState {
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<LiveSyncStatus>('connecting');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const fingerprint = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const check = async () => {
      if (inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const res = await api.get('/admin/sync-state');
        if (cancelled) return;
        const next: string | undefined = res.data?.version;
        if (next) {
          if (fingerprint.current !== null && next !== fingerprint.current) {
            setVersion((v) => v + 1);
          }
          fingerprint.current = next;
        }
        setStatus('live');
        setLastSynced(new Date());
      } catch {
        if (!cancelled) setStatus('offline');
      } finally {
        inFlight = false;
      }
    };

    check();
    const timer = window.setInterval(check, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [intervalMs]);

  return { version, status, lastSynced };
}
