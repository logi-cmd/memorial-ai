'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  preview?: string | null;
}

export default function ImageUpload({ onUpload, preview: externalPreview }: ImageUploadProps) {
  const t = useTranslations('upload');
  const [preview, setPreview] = useState<string | null>(externalPreview || null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    // 客户端预览
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
        dragOver
          ? 'border-violet-400 bg-violet-50/50'
          : 'border-stone-200 hover:border-violet-300 hover:bg-violet-50/30'
      }`}
    >
      {preview ? (
        <div className="relative w-full h-full">
          <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
          <button
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-2xl">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <>
          <Upload className="w-10 h-10 text-stone-300 mb-2" />
          <span className="text-sm text-stone-400">
            {uploading ? t('uploading') : t('clickOrDrag')}
          </span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInput}
        className="hidden"
      />
    </div>
  );
}
