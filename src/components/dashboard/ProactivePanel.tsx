'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import ProactiveMessageCard from '@/components/avatar/ProactiveMessageCard';

interface ProactiveMessage {
  id: string;
  avatar_id: string;
  type: string;
  title: string;
  content: string;
}

export default function ProactivePanel() {
  const [messages, setMessages] = useState<ProactiveMessage[]>([]);

  useEffect(() => {
    fetch('/api/proactive')
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch(() => {});
  }, []);

  const handleDismiss = async (id: string) => {
    await fetch('/api/proactive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', messageId: id }),
    });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleView = (avatarId: string) => {
    window.location.href = `/chat/${avatarId}`;
  };

  if (messages.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
        <Bell className="w-4 h-4 text-violet-500" />
        Proactive Messages ({messages.length})
      </div>
      {messages.map((m) => (
        <ProactiveMessageCard
          key={m.id}
          id={m.id}
          avatarId={m.avatar_id}
          type={m.type}
          title={m.title}
          content={m.content}
          onDismiss={handleDismiss}
          onView={handleView}
        />
      ))}
    </div>
  );
}
