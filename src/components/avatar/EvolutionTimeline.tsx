'use client';

interface EvolutionEvent {
  id: string;
  avatar_id: string;
  patches: Record<string, unknown>[];
  significance: number;
  created_at: string;
}

interface EvolutionTimelineProps {
  events: EvolutionEvent[];
}

export default function EvolutionTimeline({ events }: EvolutionTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-stone-400">No evolution history</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="flex gap-3">
          <div className="w-2 h-2 bg-violet-400 rounded-full mt-1.5 shrink-0" />
          <div>
            <p className="text-sm text-stone-700">
              {event.patches.length} field(s) updated
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-stone-400">
                {new Date(event.created_at).toLocaleDateString()}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                event.significance >= 3 ? 'bg-violet-100 text-violet-600' : 'bg-stone-100 text-stone-500'
              }`}>
                +{event.significance}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
