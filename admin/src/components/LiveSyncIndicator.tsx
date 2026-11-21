import type { LiveSyncStatus } from '../lib/liveSync';

type LiveSyncIndicatorProps = {
  status: LiveSyncStatus;
  lastSynced: Date | null;
  // 'dark' for use on a dark sidebar.
  tone?: 'light' | 'dark';
};

const LABELS: Record<LiveSyncStatus, string> = {
  connecting: 'Connecting',
  live: 'Live',
  offline: 'Reconnecting',
};

// Small pill showing whether the panel is in sync with the database.
export default function LiveSyncIndicator({ status, lastSynced, tone = 'light' }: LiveSyncIndicatorProps) {
  const dot =
    status === 'live' ? 'bg-emerald-500' : status === 'offline' ? 'bg-amber-500' : 'bg-slate-400';
  const pill =
    tone === 'dark'
      ? 'border-slate-700/80 bg-slate-800/60 text-slate-300'
      : 'border-slate-200 bg-white text-slate-600';
  const title =
    status === 'live' && lastSynced
      ? `In sync with the database - last checked ${lastSynced.toLocaleTimeString()}`
      : status === 'offline'
        ? 'Cannot reach the server - retrying automatically'
        : 'Connecting to the database';

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${pill}`}
    >
      <span className="relative flex h-2 w-2">
        {status === 'live' && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${dot} opacity-60 animate-ping [animation-duration:2.4s]`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {LABELS[status]}
    </span>
  );
}
