import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/lib/voice';

// POST /api/voice - 使用克隆声音进行 TTS
export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, stability = 0.6 } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const audioBuffer = await textToSpeech(text, voiceId, 'eleven_multilingual_v2');

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error('TTS error:', err);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}
