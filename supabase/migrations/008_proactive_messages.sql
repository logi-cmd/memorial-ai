-- ============================================================
-- 主动消息表
-- ============================================================

create table public.proactive_messages (
  id uuid default gen_random_uuid() primary key,
  avatar_id uuid not null references public.avatars(id) on delete cascade,
  type text not null check (type in ('birthday', 'anniversary', 'high_importance_memory', 'emotional_checkin')),
  title text not null,
  content text not null,
  dismissed boolean default false,
  sent boolean default false,
  created_at timestamptz default now() not null
);

-- 索引
create index idx_proactive_messages_avatar_id on public.proactive_messages(avatar_id);
create index idx_proactive_messages_unsent on public.proactive_messages(avatar_id, dismissed, sent) where not dismissed and not sent;

-- RLS
alter table public.proactive_messages enable row level security;

create policy "proactive_messages_via_avatar" on public.proactive_messages
  for all using (
    avatar_id in (select id from public.avatars where user_id = auth.uid())
  );
