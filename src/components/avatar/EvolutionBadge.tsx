'use client';

interface EvolutionBadgeProps {
  version: number;
  hasUpdate?: boolean;
}

export default function EvolutionBadge({ version, hasUpdate }: EvolutionBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-stone-400">v{version}</span>
      {hasUpdate && (
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      )}
    </div>
  );
}
