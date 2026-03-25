import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cloneVoice } from '@/lib/voice';

// POST /api/upload/voice — 上传语音并克隆
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const avatarId = formData.get('avatarId') as string;
    const avatarName = formData.get('avatarName') as string;

    if (!file || !avatarId || !avatarName) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    // 上传到 Supabase Storage
    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'mp3';
    const filePath = `${user.id}/${avatarId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, audioBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // ElevenLabs 声音克隆
    let voiceId: string | null = null;
    try {
      const cloneResult = await cloneVoice(
        audioBuffer.buffer as ArrayBuffer,
        `memorial-${avatarName}-${Date.now()}`
      );
      voiceId = cloneResult.voice_id;
    } catch (err) {
      console.error('Voice clone failed:', err);
      // 声音克隆失败不阻塞上传，后续可重试
    }

    // 更新 avatars 表
    const updateData: Record<string, unknown> = {};
    if (voiceId) updateData.voice_id = voiceId;

    const { error: updateError } = await supabase
      .from('avatars')
      .update(updateData)
      .eq('id', avatarId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      voiceId,
      message: voiceId ? '语音上传并克隆成功' : '语音上传成功，声音克隆失败',
    });
  } catch (err) {
    console.error('Voice upload error:', err);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
