import { NextRequest, NextResponse } from 'next/server';

// GET /api/avatars/evolution?avatarId=xxx — 获取演化历史
// Note: character_card_history table not in SQLite schema; returns empty for now.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const avatarId = searchParams.get('avatarId');

  if (!avatarId) {
    return NextResponse.json({ error: '缺少 avatarId' }, { status: 400 });
  }

  // character_card_history is not migrated to SQLite schema yet
  return NextResponse.json({ history: [] });
}
