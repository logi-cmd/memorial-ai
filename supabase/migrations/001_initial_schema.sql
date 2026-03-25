-- ============================================================
-- 数字分身项目 - 数据库 Schema
-- Supabase (PostgreSQL + pgvector)
-- ============================================================

-- 启用 pgvector 扩展
create extension if not exists vector;

-- 用户表
create table public.users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text not null,
  subscription_plan text default 'free' check (subscription_plan in ('free', 'memorial', 'remembrance')),
  subscription_expires_at timestamptz,
  created_at timestamptz default now() not null
);

-- 分身表
create table public.avatars (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  relationship text not null,
  photo_url text,
  voice_id text,
  profile jsonb default '{}'::jsonb,
  system_prompt text,
  creation_step int default 1 check (creation_step between 1 and 4),
  is_public boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 记忆表（含向量嵌入）
create table public.memories (
  id uuid default gen_random_uuid() primary key,
  avatar_id uuid not null references public.avatars(id) on delete cascade,
  content text not null,
  source text default 'conversation' check (source in ('conversation', 'auto_extract', 'manual')),
  importance int default 5 check (importance between 1 and 10),
  confirmed boolean default true,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- 对话表
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  avatar_id uuid not null references public.avatars(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  messages jsonb default '[]'::jsonb,
  emotion_summary text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- 索引
-- ============================================================

create index idx_avatars_user_id on public.avatars(user_id);
create index idx_memories_avatar_id on public.memories(avatar_id);
create index idx_conversations_avatar_id on public.conversations(avatar_id);
create index idx_conversations_user_id on public.conversations(user_id);

-- 向量相似度索引（HNSW，适合中小规模数据）
create index idx_memories_embedding on public.memories
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.users enable row level security;
alter table public.avatars enable row level security;
alter table public.memories enable row level security;
alter table public.conversations enable row level security;

-- 用户只能读写自己的数据
create policy "users_self" on public.users
  for all using (auth.uid() = id);

create policy "avatars_user" on public.avatars
  for all using (auth.uid() = user_id);

create policy "memories_via_avatar" on public.memories
  for all using (
    avatar_id in (select id from public.avatars where user_id = auth.uid())
  );

create policy "conversations_user" on public.conversations
  for all using (auth.uid() = user_id);

-- 公开分身的读取（如果 is_public = true）
create policy "avatars_public_read" on public.avatars
  for select using (is_public = true);

-- ============================================================
-- 辅助函数：向量相似度搜索
-- ============================================================

create or replace function match_memories(
  query_embedding vector(1536),
  target_avatar_id uuid,
  match_threshold float default 0.7,
  match_count int default 5
)
returns setof public.memories
language sql stable
as $$
  select *
  from public.memories
  where avatar_id = target_avatar_id
    and confirmed = true
    and embedding is not null
    and (embedding <=> query_embedding) < 1 - match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- 自动更新 updated_at 触发器
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger avatars_updated_at
  before update on public.avatars
  for each row execute function update_updated_at();

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function update_updated_at();
