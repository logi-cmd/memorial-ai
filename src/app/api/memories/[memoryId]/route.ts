import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ memoryId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { memoryId } = await params;

    const serverSupabase = await createSupabaseServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { confirmed } = body;
    if (typeof confirmed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body: confirmed must be boolean' }, { status: 400 });
    }

    const { data: memory, error: fetchError } = await supabase
      .from('memories')
      .select('id, avatar_id')
      .eq('id', memoryId)
      .single();

    if (fetchError || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const { data: avatar } = await supabase
      .from('avatars')
      .select('user_id')
      .eq('id', memory.avatar_id)
      .single();

    if (!avatar || avatar.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('memories')
      .update({ confirmed })
      .eq('id', memoryId)
      .select()
      .single();

    if (updateError) {
      console.error('Memory update error:', updateError);
      return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Memory PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { memoryId } = await params;

    const serverSupabase = await createSupabaseServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: memory, error: fetchError } = await supabase
      .from('memories')
      .select('id, avatar_id')
      .eq('id', memoryId)
      .single();

    if (fetchError || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const { data: avatar } = await supabase
      .from('avatars')
      .select('user_id')
      .eq('id', memory.avatar_id)
      .single();

    if (!avatar || avatar.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId);

    if (deleteError) {
      console.error('Memory delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Memory DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
