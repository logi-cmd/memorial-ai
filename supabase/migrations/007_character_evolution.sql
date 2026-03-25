-- ============================================================
-- Character Card 演化历史
-- ============================================================

create table public.character_card_history (
  id uuid default gen_random_uuid() primary key,
  avatar_id uuid not null references public.avatars(id) on delete cascade,
  version int not null default 1,
  patches jsonb not null default '[]'::jsonb,
  character_card jsonb not null default '{}'::jsonb,
  significance numeric default 0,
  created_at timestamptz default now() not null
);

-- 为 avatars 添加演化版本号
alter table public.avatars
  add column evolution_version int default 1;

-- 索引
create index idx_character_card_history_avatar_id on public.character_card_history(avatar_id);

-- RLS
alter table public.character_card_history enable row level security;

create policy "character_card_history_via_avatar" on public.character_card_history
  for all using (
    avatar_id in (select id from public.avatars where user_id = auth.uid())
  );
