import { createSupabaseServerClient } from './supabase-server';
import { NextResponse } from 'next/server';

/**
 * API route 中获取已认证用户，未认证返回 401
 */
export async function requireAuth(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, response: null };
}
