'use client';

import { X, Bell, Heart, MessageCircle, Calendar } from 'lucide-react';

interface ProactiveMessageCardProps {
  id: string;
  avatarId: string;
  type: string;
  title: string;
  content: string;
  avatarName?: string;
  onDismiss: (id: string) => void;
  onView: (avatarId: string) => void;
}

export default function ProactiveMessageCard({
  id,
  avatarId,
  type,
  title,
  content,
  onDismiss,
  onView,
}: ProactiveMessageCardProps) {
  const typeIcons: Record<string, React.ReactNode> = {
    birthday: <Calendar className="w-4 h-4 text-amber-500" />,
    anniversary: <Heart className="w-4 h-4 text-pink-500" />,
    high_importance_memory: <Bell className="w-4 h-4 text-violet-500" />,
    emotional_checkin: <MessageCircle className="w-4 h-4 text-blue-500" />,
  };

  return (
    <div className="flex gap-3 p-3 bg-violet-50 border border-violet-100 rounded-xl">
      <div className="mt-0.5 shrink-0">
        {typeIcons[type] || <Bell className="w-4 h-4 text-violet-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-700">{title}</p>
        <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{content}</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onView(avatarId)}
            className="text-xs px-2 py-1 bg-violet-500 text-white rounded-md hover:bg-violet-600"
          >
            View
          </button>
          <button
            onClick={() => onDismiss(id)}
            className="text-xs px-2 py-1 text-stone-400 hover:text-stone-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
