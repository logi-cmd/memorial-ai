import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// POST /api/upload/photo — 上传头像照片
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

    if (!file || !avatarId) {
      return NextResponse.json({ error: '缺少 file 或 avatarId' }, { status: 400 });
    }

    // 压缩到 512x512
    const buffer = Buffer.from(await file.arrayBuffer());
    const compressed = await compressImage(buffer, 512);

    // 上传到 Supabase Storage
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/${avatarId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, compressed, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 获取公开 URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // 更新 avatars 表
    const { error: updateError } = await supabase
      .from('avatars')
      .update({ photo_url: publicUrl })
      .eq('id', avatarId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ photoUrl: publicUrl });
  } catch (err) {
    console.error('Photo upload error:', err);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}

async function compressImage(buffer: Buffer, maxSize: number): Promise<Buffer> {
  // Server-side 不依赖 sharp，直接返回原图（Supabase Storage 支持 transform）
  // 在生产环境中可以用 @img/sharp 做服务端压缩
  return buffer;
}
