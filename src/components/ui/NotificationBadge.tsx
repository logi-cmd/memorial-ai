'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface NotificationBadgeProps {
  count?: number;
}

export default function NotificationBadge({ count: countProp }: NotificationBadgeProps) {
  const [count, setCount] = useState(countProp || 0);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/proactive');
        const data = await res.json();
        setCount((data.messages || []).length);
      } catch {}
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <a
      href="/dashboard"
      className="relative inline-flex items-center p-2 text-stone-400 hover:text-violet-600 transition-colors"
    >
      <Bell className="w-5 h-5" />
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
        {count > 9 ? '9+' : count}
      </span>
    </a>
  );
}
