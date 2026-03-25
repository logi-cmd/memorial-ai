'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, Play, Pause } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AudioUploadProps {
  onUpload: (file: File) => void;
  file?: File | null;
}

export default function AudioUpload({ onUpload, file: externalFile }: AudioUploadProps) {
  const t = useTranslations('upload');
  const [file, setFile] = useState<File | null>(externalFile || null);
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('audio/')) return;
    setFile(f);
    onUpload(f);
  };

  const togglePlay = () => {
    if (!file) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.play();
        setPlaying(true);
      } else {
        const audio = new Audio(URL.createObjectURL(file));
        audio.onended = () => setPlaying(false);
        audio.play();
        audioRef.current = audio;
        setPlaying(true);
      }
    }
  };

  return (
    <div>
      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all">
        <Upload className="w-10 h-10 text-stone-300 mb-2" />
        {file ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-violet-600">{file.name}</span>
            <button
              onClick={(e) => { e.preventDefault(); togglePlay(); }}
              className="p-1 bg-violet-100 text-violet-600 rounded-full hover:bg-violet-200"
            >
              {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        ) : (
          <span className="text-sm text-stone-400">
            {uploading ? t('uploading') : t('clickUploadAudio')}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="hidden"
        />
      </label>
    </div>
  );
}
