interface StatusDotProps {
  status: 'operational' | 'building' | 'degraded' | 'down';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function StatusDot({ status, size = 'sm', pulse = true }: StatusDotProps) {
  const colors = {
    operational: 'bg-emerald-400',
    building: 'bg-blue-400',
    degraded: 'bg-amber-400',
    down: 'bg-red-400',
  };
  const sizes = { sm: 'h-2 w-2', md: 'h-3 w-3', lg: 'h-4 w-4' };
  return (
    <span className="relative flex">
      {pulse && status === 'operational' && (
        <span className={`animate-ping absolute inline-flex ${sizes[size]} rounded-full ${colors[status]} opacity-40`} />
      )}
      <span className={`relative inline-flex rounded-full ${sizes[size]} ${colors[status]}`} />
    </span>
  );
}
