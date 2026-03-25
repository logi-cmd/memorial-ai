'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import MemoryFilter from './MemoryFilter';
import MemoryCard from './MemoryCard';

interface TimelineMonth {
  month: string;
  memories: Array<{
    id: string;
    content: string;
    source: string;
    importance: number;
    confirmed: boolean;
    confidence_score: number | null;
    memory_type: string;
    emotion_type: string | null;
    emotion_intensity: number | null;
    memory_time: string | null;
    created_at: string;
  }>;
}

interface MemoryTimelineProps {
  avatarId: string;
  onMemoryConfirm?: (memoryId: string) => void;
  onMemoryDelete?: (memoryId: string) => void;
}

export default function MemoryTimeline({ avatarId, onMemoryConfirm, onMemoryDelete }: MemoryTimelineProps) {
  const t = useTranslations('timeline');
  const [months, setMonths] = useState<TimelineMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [total, setTotal] = useState(0);

  const fetchTimeline = async (type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ avatarId });
      if (type !== 'all') {
        params.set('type', type);
      }
      const res = await fetch(`/api/memories/timeline?${params}`);
      const data = await res.json();
      setMonths(data.months || []);
      setTotal(data.total || 0);
    } catch {
      console.error('Failed to fetch timeline');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (memoryId: string) => {
    fetchTimeline(activeType);
    onMemoryConfirm?.(memoryId);
  };

  const handleDelete = (memoryId: string) => {
    fetchTimeline(activeType);
    onMemoryDelete?.(memoryId);
  };

  useEffect(() => {
    fetchTimeline(activeType);
  }, [avatarId, activeType]);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return t('monthFormat', { year, month });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('title')} ({total})</h2>
        <MemoryFilter active={activeType} onChange={setActiveType} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-stone-400">{t('loading')}</div>
      ) : months.length === 0 ? (
        <div className="text-center py-8 text-stone-400">{t('empty')}</div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-violet-100" />

          <div className="space-y-8">
            {months.map(({ month, memories }) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-violet-500 rounded-full relative z-10" />
                  <h3 className="text-sm font-semibold text-stone-600">{formatMonth(month)}</h3>
                </div>
                <div className="ml-8 space-y-3">
                  {memories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      {...memory}
                      onConfirm={handleConfirm}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
