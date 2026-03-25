'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Trash2, Brain } from 'lucide-react';
import { useTranslations } from 'next-intl';
import EvolutionBadge from './EvolutionBadge';
import ShareButton from './ShareButton';

interface AvatarCardProps {
  id: string;
  name: string;
  relationship: string;
  photo_url: string | null;
  last_conversation: string | null;
  evolution_version?: number | null;
  onDelete: (id: string) => void;
}

export default function AvatarCard({ id, name, relationship, photo_url, last_conversation, evolution_version, onDelete }: AvatarCardProps) {
  const t = useTranslations('dashboard');

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('daysAgo', { count: days });
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-32 bg-gradient-to-br from-violet-50 to-stone-50 flex items-center justify-center">
        {photo_url ? (
          <img
            src={photo_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-violet-400" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{name}</h3>
        <p className="text-sm text-stone-500">{t(`relationships.${relationship}`) || relationship}</p>
        {evolution_version && <EvolutionBadge version={evolution_version} />}
        {last_conversation && (
          <p className="text-xs text-stone-400 mt-1">
            {t('lastChat')}: {timeAgo(last_conversation)}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <Link
            href={`/chat/${id}`}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-600 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {t('chat')}
          </Link>
          <Link
            href={`/memories/${id}`}
            className="px-3 py-2 text-stone-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"
            title={t('memories')}
          >
            <Brain className="w-4 h-4" />
          </Link>
          <ShareButton avatarId={id} avatarName={name} />
          <button
            onClick={() => onDelete(id)}
            className="px-3 py-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
