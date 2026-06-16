interface FeedItem {
  icon: string;
  agent: string;
  action: string;
  timeAgo: string;
}

interface LiveFeedProps {
  items: FeedItem[];
  title: string;
  isLive?: boolean;
}

export function LiveFeed({ items, title, isLive = false }: LiveFeedProps) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/50 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-slate-100">{title}</span>
        {isLive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        )}
      </div>

      {/* Feed items */}
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-slate-800/50 transition-colors duration-150"
          >
            <span className="mt-0.5 shrink-0">{item.icon}</span>
            <span className="text-slate-400 shrink-0 font-medium">{item.agent}</span>
            <span className="text-slate-300 flex-1">{item.action}</span>
            <span className="text-slate-600 shrink-0 whitespace-nowrap">{item.timeAgo}</span>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="text-xs text-slate-600 text-center py-4">No recent activity</p>
      )}
    </div>
  );
}
