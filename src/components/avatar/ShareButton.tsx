'use client';

import { useState, useRef, useEffect } from 'react';
import { Share2, Link2, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ShareButtonProps {
  avatarId: string;
  avatarName: string;
}

export default function ShareButton({ avatarId, avatarName }: ShareButtonProps) {
  const t = useTranslations('share');
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shareUrl = `https://memorial-ai.app/share/${avatarId}`;

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-stone-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"
        title={t('shareAvatar')}
      >
        <Share2 className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-stone-100 rounded-lg shadow-lg z-10 py-1">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:bg-violet-50 hover:text-violet-600 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            {copied ? t('linkCopied') : t('copyLink')}
          </button>
          <button
            disabled
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-400 cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4" />
            {t('shareToWechat')}
          </button>
        </div>
      )}
    </div>
  );
}
