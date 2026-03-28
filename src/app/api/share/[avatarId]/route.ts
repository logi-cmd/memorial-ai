import { NextRequest, NextResponse } from 'next/server';
import { getAvatarById } from '@/lib/db';

// GET /api/share/[avatarId] — 获取公开的头像信息（无需认证）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ avatarId: string }> }
) {
  const { avatarId } = await params;

  if (!avatarId) {
    return NextResponse.json({ error: 'Missing avatarId' }, { status: 400 });
  }

  const avatar = getAvatarById(avatarId) as any;

  if (!avatar) {
    return NextResponse.json(
      { error: 'Avatar not found', message: '未找到该数字分身' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    avatar: {
      id: avatar.id,
      name: avatar.name,
      relationship: avatar.relationship,
      photo_url: avatar.photo_url,
      created_at: avatar.created_at,
    },
    message: 'TA 的数字分身，承载着珍贵的记忆',
  });
}
