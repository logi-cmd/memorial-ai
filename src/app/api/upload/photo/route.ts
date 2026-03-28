import { NextRequest, NextResponse } from 'next/server';
import { storeFile, updateAvatar } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const avatarId = formData.get('avatarId') as string;

    if (!file || !avatarId) {
      return NextResponse.json({ error: '缺少 file 或 avatarId' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${avatarId}.${ext}`;

    const savedPath = storeFile('photos', filename, buffer);
    const photoUrl = `file://${savedPath}`;

    updateAvatar(avatarId, { photo_url: photoUrl });

    return NextResponse.json({ photoUrl });
  } catch (err) {
    console.error('Photo upload error:', err);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
