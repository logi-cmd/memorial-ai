import { NextRequest, NextResponse } from 'next/server';
import { storeFile, updateAvatar } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const avatarId = formData.get('avatarId') as string;

    if (!file || !avatarId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'mp3';
    const filename = `${avatarId}.${ext}`;

    storeFile('voices', filename, audioBuffer);

    updateAvatar(avatarId, { voice_id: filename });

    return NextResponse.json({
      success: true,
      voiceId: filename,
      message: '语音上传成功',
    });
  } catch (err) {
    console.error('Voice upload error:', err);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
