'use client';

import { useTranslations } from 'next-intl';
import MemoryConfirm from './MemoryConfirm';

interface MemoryCardProps {
  id: string;
  content: string;
  source: string;
  importance: number;
  memory_type: string;
  emotion_type?: string | null;
  confirmed: boolean;
  created_at: string;
  onConfirm?: (memoryId: string) => void;
  onDelete?: (memoryId: string) => void;
}

export default function MemoryCard({
  id,
  content,
  source,
  importance,
  memory_type,
  emotion_type,
  confirmed,
  created_at,
  onConfirm,
  onDelete,
}: MemoryCardProps) {
  const t = useTranslations('timeline');

  const typeColors: Record<string, string> = {
    core_identity: 'bg-violet-100 text-violet-700',
    personality: 'bg-blue-100 text-blue-700',
    life_event: 'bg-amber-100 text-amber-700',
    relationship: 'bg-pink-100 text-pink-700',
    habit: 'bg-green-100 text-green-700',
    conversation: 'bg-stone-100 text-stone-600',
    auto_extract: 'bg-stone-100 text-stone-600',
    manual: 'bg-indigo-100 text-indigo-700',
  };

  const dateStr = new Date(created_at).toLocaleDateString();

  return (
    <div className={`p-4 rounded-xl border ${confirmed ? 'bg-white border-stone-100' : 'bg-amber-50/50 border-amber-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[memory_type] || 'bg-stone-100 text-stone-600'}`}>
          {t(`types.${memory_type}`) || memory_type}
        </span>
        {emotion_type && (
          <span className="text-xs text-stone-400">{emotion_type}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {Array.from({ length: Math.min(importance, 5) }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
          ))}
        </div>
      </div>
      <p className="text-sm text-stone-700 leading-relaxed">{content}</p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>{dateStr}</span>
          <span>{t(`sources.${source}`) || source}</span>
        </div>
        {onConfirm && onDelete && (
          <MemoryConfirm
            memoryId={id}
            confirmed={confirmed}
            onConfirm={onConfirm}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}
