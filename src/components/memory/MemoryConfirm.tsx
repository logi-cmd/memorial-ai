'use client';

import { useState } from 'react';
import { Check, X, Trash2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MemoryConfirmProps {
  memoryId: string;
  confirmed: boolean;
  onConfirm: (memoryId: string) => void;
  onDelete: (memoryId: string) => void;
}

export default function MemoryConfirm({
  memoryId,
  confirmed,
  onConfirm,
  onDelete,
}: MemoryConfirmProps) {
  const t = useTranslations('timeline');
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticConfirmed, setOptimisticConfirmed] = useState(confirmed);
  const [isDeleted, setIsDeleted] = useState(false);

  if (isDeleted) return null;

  const handleConfirm = async () => {
    if (optimisticConfirmed) return;
    
    setOptimisticConfirmed(true);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });

      if (!res.ok) {
        setOptimisticConfirmed(false);
        return;
      }

      onConfirm(memoryId);
    } catch {
      setOptimisticConfirmed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE',
      });

      if (!res.ok) return;

      setIsDeleted(true);
      onDelete(memoryId);
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  if (!optimisticConfirmed) {
    return (
      <div className="flex items-center gap-1.5">
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
          title={t('pendingTooltip')}
        >
          <Clock className="w-3 h-3" />
          {t('pending')}
        </span>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="p-1 rounded hover:bg-green-100 text-stone-400 hover:text-green-600 transition-colors disabled:opacity-50"
          title={t('confirmTooltip')}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="p-1 rounded hover:bg-red-100 text-stone-400 hover:text-red-600 transition-colors disabled:opacity-50"
          title={t('deleteTooltip')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <Check className="w-3 h-3" />
        {t('confirmed')}
      </span>
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="p-1 rounded hover:bg-red-100 text-stone-400 hover:text-red-600 transition-colors disabled:opacity-50"
        title={t('deleteTooltip')}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
