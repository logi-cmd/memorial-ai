import { EdgeTTS } from 'node-edge-tts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const VOICE_MAP: Record<string, string> = {
  zh: 'zh-CN-XiaoxiaoNeural',
  en: 'en-US-JennyNeural',
  ja: 'ja-JP-NanamiNeural',
};

export async function edgeTtsSynthesize(
  text: string,
  lang: string = 'zh',
  voiceId?: string
): Promise<Buffer> {
  const voice = voiceId || VOICE_MAP[lang] || VOICE_MAP.zh;
  const tts = new EdgeTTS({
    voice,
    rate: '+0%',
    pitch: '+0Hz',
  });
  
  // Create temp file path
  const tempFile = path.join(os.tmpdir(), `edge-tts-${Date.now()}.mp3`);
  
  await tts.ttsPromise(text, tempFile);
  
  // Read the file and return as buffer
  const audioBuffer = fs.readFileSync(tempFile);
  
  // Clean up temp file
  fs.unlinkSync(tempFile);
  
  return audioBuffer;
}

export async function edgeTtsGetVoices() {
  return Object.entries(VOICE_MAP).map(([lang, voice]) => ({ id: voice, name: `${lang} (${voice})` }));
}