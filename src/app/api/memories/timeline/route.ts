import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/memories/timeline?avatarId=xxx&type=xxx — 按月分组返回记忆
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');
  const type = searchParams.get('type');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 验证分身归属
  const { data: avatar } = await supabase
    .from('avatars')
    .select('id')
    .eq('id', avatarId)
    .eq('user_id', user.id)
    .single();

  if (!avatar) {
    return NextResponse.json({ error: '分身不存在' }, { status: 404 });
  }

  let query = supabase
    .from('memories')
    .select('id, content, source, importance, confirmed, confidence_score, memory_type, emotion_type, emotion_intensity, memory_time, created_at')
    .eq('avatar_id', avatarId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (type && type !== 'all') {
    if (type === 'pending') {
      query = query.eq('confirmed', false);
    } else {
      query = query.eq('memory_type', type);
    }
  }

  const { data: memories, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 按月分组
  const grouped: Record<string, typeof memories> = {};
  for (const m of memories || []) {
    const date = new Date(m.memory_time || m.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  return NextResponse.json({
    months: Object.entries(grouped).map(([month, items]) => ({ month, memories: items })),
    total: (memories || []).length,
  });
}
