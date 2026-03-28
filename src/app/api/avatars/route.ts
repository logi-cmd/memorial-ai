import { NextRequest, NextResponse } from 'next/server';
import { getAvatars, getConversations, deleteAvatar, updateAvatar } from '@/lib/db';

// GET /api/avatars — 获取所有分身（含最后对话时间）
export async function GET() {
  const avatars = getAvatars() as any[];

  // 获取每个分身的最后对话时间
  const result = avatars.map((a) => {
    const convs = getConversations(a.id, 1) as any[];
    return {
      ...a,
      last_conversation: convs.length > 0 ? convs[0].created_at : null,
    };
  });

  return NextResponse.json({ avatars: result });
}

// DELETE /api/avatars — 删除分身
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  deleteAvatar(avatarId);
  return NextResponse.json({ success: true });
}

// PATCH /api/avatars — 更新分身信息
export async function PATCH(request: NextRequest) {
  const { avatarId, ...updates } = await request.json();

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const avatar = updateAvatar(avatarId, updates);
  return NextResponse.json({ avatar });
}
