-- ============================================================
-- P1.2 结构化 Character Card
-- ============================================================

alter table public.avatars
  add column if not exists character_card jsonb;
