import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/proactive?avatarId=xxx — 获取未发送的主动消息
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    // 获取所有分身的未发送消息
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取用户所有分身的未读消息
    const { data: avatarIds } = await supabase
      .from('avatars')
      .select('id')
      .eq('user_id', user.id);

    if (!avatarIds || avatarIds.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    const ids = avatarIds.map((a) => a.id);
    const { data: messages, error } = await supabase
      .from('proactive_messages')
      .select('*')
      .in('avatar_id', ids)
      .eq('dismissed', false)
      .eq('sent', false)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: messages, error } = await supabase
    .from('proactive_messages')
    .select('*')
    .eq('avatar_id', avatarId)
    .eq('dismissed', false)
    .eq('sent', false)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: messages || [] });
}

// POST /api/proactive — 创建或操作主动消息
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, messageId, ...data } = body;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (action === 'dismiss') {
    const { error } = await supabase
      .from('proactive_messages')
      .update({ dismissed: true })
      .eq('id', messageId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'mark_sent') {
    const { error } = await supabase
      .from('proactive_messages')
      .update({ sent: true })
      .eq('id', messageId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // 创建新主动消息
  const { avatarId, type, title, content } = data;
  if (!avatarId || !title || !content) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  const { error } = await supabase.from('proactive_messages').insert({
    avatar_id: avatarId,
    type,
    title,
    content,
    dismissed: false,
    sent: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
