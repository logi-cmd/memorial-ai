import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/providers/config';
import { getTTSProvider } from '@/lib/providers';

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, lang = 'zh' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const config = getAppConfig();
    const ttsMod = getTTSProvider(config);
    const audioBuffer = await ttsMod.edgeTtsSynthesize(text, lang, voiceId);

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
