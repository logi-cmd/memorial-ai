-- ============================================================
-- P1.4 记忆系统修复 + 对话增强
-- ============================================================

-- 1. conversations 表：情感轨迹
alter table public.conversations
  add column if not exists emotion_trajectory jsonb default '[]'::jsonb;
-- 格式: [{"turn": 1, "user_text": "...", "emotion": "sadness", "intensity": 0.85, "timestamp": "..."}]

-- 2. conversations 表：对话摘要
alter table public.conversations
  add column if not exists summary jsonb;
-- 格式: {"topics": [...], "emotion_arc": [...], "new_info": [...], "summary_text": "..."}

-- 3. conversations 表：消息轮次计数
alter table public.conversations
  add column if not exists turn_count int default 0;

-- 4. conversations 表：上次摘要的轮次位置
alter table public.conversations
  add column if not exists last_summary_turn int default 0;

-- 5. memories 表：confidence_score 顶层字段
alter table public.memories
  add column if not exists confidence_score float check (confidence_score between 0.0 and 1.0);

-- ============================================================
-- 重写 match_memories_weighted：移除 confirmed 硬过滤
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
      (
        (1 - (m.embedding <=> query_embedding)) * 0.45 +
        coalesce(m.emotion_intensity, 0) * 0.15 +
        m.importance / 10.0 * 0.2 +
        least(m.access_count / 10.0, 1.0) * 0.05 +
        (case when m.confirmed then 1.0 else coalesce(m.confidence_score, 0) end) * 0.15
      ) as score
    from public.memories m
    where m.avatar_id = target_avatar_id
      and m.embedding is not null
      and (m.embedding <=> query_embedding) < 1 - match_threshold
      and (m.confirmed = true or coalesce(m.confidence_score, 0) >= 0.7)
    order by score desc
    limit match_count
  )
  select * from scored
  order by score desc;
$$;

-- ============================================================
-- 自动确认高置信度记忆
-- ============================================================
create or replace function auto_confirm_high_confidence(
  target_avatar_id uuid,
  confidence_threshold float default 0.8
)
returns int as $$
declare
  updated_count int;
begin
  update public.memories
  set confirmed = true
  where (target_avatar_id is null or avatar_id = target_avatar_id)
    and confirmed = false
    and coalesce(confidence_score, 0) >= confidence_threshold
    and created_at < now() - interval '1 hour';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  return updated_count;
end;
$$ language plpgsql;

-- ============================================================
-- 一次性迁移：将已有 metadata.confidence 提升到顶层字段
-- ============================================================
-- update public.memories
-- set confidence_score = (metadata->>'confidence')::float
-- where confirmed = false
--   and metadata->>'confidence' is not null;
