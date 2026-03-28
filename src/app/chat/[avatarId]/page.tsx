'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Send, Mic, MicOff, Volume2, VolumeX, Settings, Sparkles, Home } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const params = useParams();
  const avatarId = params.avatarId as string;
  const t = useTranslations('chat');
  const tc = useTranslations('common');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceOn, setIsVoiceOn] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [avatarName, setAvatarName] = useState(t('defaultAvatarName'));
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [lastTtsStability, setLastTtsStability] = useState(0.5);
  const [pendingMemories, setPendingMemories] = useState<
    { id: string; content: string }[]
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (avatarId) {
      fetch(`/api/create?avatarId=${avatarId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.avatar) {
            setAvatarName(data.avatar.name);
            if (data.avatar.voice_id) setVoiceId(data.avatar.voice_id);
          }
        })
        .catch(() => {});
    }
  }, [avatarId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPendingMemories = async () => {
    try {
      const res = await fetch(`/api/memories?avatarId=${avatarId}`);
      const data = await res.json();
      setPendingMemories(data.pending || []);
    } catch {}
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId,
          message: text,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'emotion') {
                setLastTtsStability(parsed.tts_stability);
              } else if (parsed.text) {
                assistantMessage += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }

      loadPendingMemories();
    } catch (err) {
      console.error('Send message error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('errorRetry') },
      ]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert(t('browserNotSupported'));
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: { results: { [Symbol.iterator](): Iterator<{ 0: { transcript: string } }> } }) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  };

  const speakLastMessage = async () => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (!lastAssistant) return;

    if (isVoiceOn) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setIsVoiceOn(false);
      return;
    }

    if (voiceId) {
      try {
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: lastAssistant.content,
            voiceId,
            stability: lastTtsStability,
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            setIsVoiceOn(false);
            URL.revokeObjectURL(url);
          };
          currentAudioRef.current = audio;
          audio.play();
          setIsVoiceOn(true);
          return;
        }
      } catch {
        console.error('ElevenLabs TTS failed, falling back to browser TTS');
      }
    }

    const utterance = new SpeechSynthesisUtterance(lastAssistant.content);
    utterance.lang = 'zh-CN';
    utterance.onend = () => setIsVoiceOn(false);
    window.speechSynthesis.speak(utterance);
    setIsVoiceOn(true);
  };

  const confirmMemory = async (memoryId: string) => {
    await fetch('/api/memories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memoryId, confirmed: true }),
    });
    setPendingMemories((prev) => prev.filter((m) => m.id !== memoryId));
  };

  const deleteMemory = async (memoryId: string) => {
    await fetch(`/api/memories?memoryId=${memoryId}`, { method: 'DELETE' });
    setPendingMemories((prev) => prev.filter((m) => m.id !== memoryId));
  };

  const userTurnCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-stone-400 hover:text-stone-600">
            <Home className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold">{avatarName}</h1>
            <p className="text-xs text-stone-400">
              {messages.length === 0 ? t('newConversation') : t('turns', { count: userTurnCount })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMemories(!showMemories)}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"
            title={t('memoryManagement')}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
                <div>
                  <p className="text-stone-500">{t('startConversation', { name: avatarName })}</p>
                  <p className="text-sm text-stone-400 mt-1">
                    {t('chatMore')}
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-500 text-white rounded-br-md'
                      : 'bg-white border border-stone-100 shadow-sm rounded-bl-md'
                  }`}
                >
                  {msg.content || <span className="animate-blink">|</span>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending memories banner */}
          {pendingMemories.length > 0 && !showMemories && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  {t('pendingMemories', { count: pendingMemories.length })}
                </span>
                <button
                  onClick={() => setShowMemories(true)}
                  className="ml-auto text-xs underline"
                >
                  {t('view')}
                </button>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-stone-100 bg-white">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleListening}
                className={`p-2 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-50 text-red-500 animate-pulse'
                    : 'hover:bg-stone-100 text-stone-400'
                }`}
                title={t('voiceInput')}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={t('messagePlaceholder', { name: avatarName })}
                className="flex-1 px-4 py-2.5 bg-stone-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                disabled={isStreaming}
              />
              {messages.some((m) => m.role === 'assistant') && (
                <button
                  onClick={speakLastMessage}
                  className={`p-2 rounded-lg transition-colors ${
                    isVoiceOn
                      ? 'bg-violet-100 text-violet-600'
                      : 'hover:bg-stone-100 text-stone-400'
                  }`}
                  title={t('voiceOutput')}
                >
                  {isVoiceOn ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="p-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Memory panel sidebar */}
        {showMemories && (
          <div className="w-80 border-l border-stone-100 bg-white overflow-y-auto animate-fade-in">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t('memoryManagement')}</h3>
                <button
                  onClick={() => setShowMemories(false)}
                  className="text-stone-400 hover:text-stone-600 text-sm"
                >
                  {tc('close')}
                </button>
              </div>

              <ManualMemoryForm avatarId={avatarId} />

              {pendingMemories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-amber-600 mb-2">
                    {t('pendingLabel')} ({pendingMemories.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingMemories.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-amber-50 rounded-lg border border-amber-100"
                      >
                        <p className="text-sm text-stone-700 mb-2">{m.content}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmMemory(m.id)}
                            className="text-xs px-3 py-1 bg-green-50 text-green-600 rounded-md hover:bg-green-100"
                          >
                            {tc('confirm')}
                          </button>
                          <button
                            onClick={() => deleteMemory(m.id)}
                            className="text-xs px-3 py-1 bg-stone-100 text-stone-500 rounded-md hover:bg-stone-200"
                          >
                            {tc('delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualMemoryForm({ avatarId }: { avatarId: string }) {
  const t = useTranslations('chat');

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const addMemory = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId, content: content.trim() }),
      });
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-stone-500 mb-2">{t('manualMemory')}</h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addMemory()}
          placeholder={t('addMemoryPlaceholder')}
          className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          onClick={addMemory}
          disabled={loading || !content.trim()}
          className="px-3 py-2 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-600 disabled:opacity-40"
        >
          {t('addMemory')}
        </button>
      </div>
    </div>
  );
}
