-- ============================================================
-- 记忆系统增强 - P0 改进
-- 增加记忆分类、时间维度、情感维度、访问计数
-- ============================================================

-- 扩展 memories 表
alter table public.memories
  add column if not exists memory_time timestamptz,
  add column if not exists emotion_type text check (emotion_type in ('joy', 'sadness', 'anger', 'fear', 'pride', 'love', 'nostalgia', 'neutral', null)),
  add column if not exists emotion_intensity float check (emotion_intensity between 0.0 and 1.0),
  add column if not exists access_count int default 0,
  add column if not exists memory_type text default 'episodic' check (memory_type in ('core_identity', 'episodic', 'semantic', 'autobiographical', 'relational', 'preference'));

-- 索引
create index if not exists idx_memories_type on public.memories(avatar_id, memory_type);
create index if not exists idx_memories_emotion on public.memories(avatar_id, emotion_intensity);

-- ============================================================
-- 升级版记忆匹配函数（加权检索）
-- ============================================================

create or replace function match_memories_weighted(
  query_embedding vector(1536),
  target_avatar_id uuid,
  match_threshold float default 0.5,
  match_count int default 7
)
returns table (
  id uuid,
  content text,
  source text,
  importance int,
  confirmed boolean,
  memory_type text,
  emotion_type text,
  emotion_intensity float,
  access_count int,
  memory_time timestamptz,
  similarity float,
  score float
)
language sql stable
as $$
  with scored as (
    select
      m.*,
      (1 - (m.embedding <=> query_embedding)) as similarity,
      -- 加权评分：语义相似度 * 0.5 + 情感强度 * 0.2 + 重要性/10 * 0.2 + min(access_count/10, 1) * 0.1
      (
        (1 - (m.embedding <=> query_embedding)) * 0.5 +
        coalesce(m.emotion_intensity, 0) * 0.2 +
        m.importance / 10.0 * 0.2 +
        least(m.access_count / 10.0, 1.0) * 0.1
      ) as score
    from public.memories m
    where m.avatar_id = target_avatar_id
      and m.confirmed = true
      and m.embedding is not null
      and (m.embedding <=> query_embedding) < 1 - match_threshold
    order by score desc
    limit match_count
  )
  select * from scored
  order by score desc;
$$;

-- ============================================================
-- 记忆去重函数（检查是否已存在语义相似记忆）
-- ============================================================

create or replace function find_similar_memory(
  check_embedding vector(1536),
  target_avatar_id uuid,
  similarity_threshold float default 0.92
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    m.id,
    m.content,
    (1 - (m.embedding <=> check_embedding)) as similarity
  from public.memories m
  where m.avatar_id = target_avatar_id
    and m.embedding is not null
    and (m.embedding <=> check_embedding) < 1 - similarity_threshold
  order by similarity desc
  limit 3;
$$;

-- ============================================================
-- 每次记忆被检索时更新 access_count（通过应用层调用）
-- ============================================================

create or replace function increment_memory_access(memory_id uuid)
returns void as $$
begin
  update public.memories
  set access_count = coalesce(access_count, 0) + 1
  where id = memory_id;
end;
$$ language plpgsql;
