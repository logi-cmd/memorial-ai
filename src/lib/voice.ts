const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io';

export interface VoiceCloneResult {
  voice_id: string;
  status: string;
}

// 克隆声音（异步，需要 ≥1 分钟清晰音频）
export async function cloneVoice(audioBuffer: ArrayBuffer, voiceName: string): Promise<VoiceCloneResult> {
  const formData = new FormData();
  formData.append('name', voiceName);
  formData.append('description', `AI cloned voice - ${voiceName}`);
  formData.append('files', new Blob([audioBuffer], { type: 'audio/mpeg' }), `${voiceName}.mp3`);

  const response = await fetch(`${ELEVENLABS_API_URL}/v1/voices/add`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voice clone failed: ${error}`);
  }

  return response.json();
}

// 文字转语音（用克隆后的声音）
export async function textToSpeech(
  text: string,
  voiceId: string,
  model: string = 'eleven_multilingual_v2',
  stability: number = 0.6
): Promise<ArrayBuffer> {
  const response = await fetch(`${ELEVENLABS_API_URL}/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS failed: ${await response.text()}`);
  }

  return response.arrayBuffer();
}

// 获取可用声音列表
export async function getVoices() {
  const response = await fetch(`${ELEVENLABS_API_URL}/v1/voices`, {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
  });
  return response.json();
}
