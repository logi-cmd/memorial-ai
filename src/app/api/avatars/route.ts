import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/avatars — 获取当前用户的所有分身（含最后对话时间）
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: avatars, error } = await supabase
    .from('avatars')
    .select('id, name, relationship, photo_url, character_card, created_at, updated_at, evolution_version')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 获取每个分身的最后对话时间
  const avatarIds = (avatars || []).map((a) => a.id);
  let lastConversationMap: Record<string, string> = {};

  if (avatarIds.length > 0) {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('avatar_id, updated_at')
      .in('avatar_id', avatarIds)
      .order('updated_at', { ascending: false });

    if (conversations) {
      // 每个 avatar 取最近的对话
      const seen = new Set<string>();
      for (const c of conversations) {
        if (!seen.has(c.avatar_id)) {
          seen.add(c.avatar_id);
          lastConversationMap[c.avatar_id] = c.updated_at;
        }
      }
    }
  }

  const result = (avatars || []).map((a) => ({
    ...a,
    last_conversation: lastConversationMap[a.id] || null,
  }));

  return NextResponse.json({ avatars: result });
}

// DELETE /api/avatars — 删除分身
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('avatars')
    .delete()
    .eq('id', avatarId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/avatars — 更新分身信息
export async function PATCH(request: NextRequest) {
  const { avatarId, ...updates } = await request.json();

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('avatars')
    .update(updates)
    .eq('id', avatarId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ avatar: data });
}
