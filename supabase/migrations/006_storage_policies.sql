-- ============================================================
-- 语音存储 bucket + 细粒度存储策略
-- ============================================================

-- 语音录制存储 bucket（私有）
insert into storage.buckets (id, name, public)
values ('voice-recordings', 'voice-recordings', false)
on conflict (id) do nothing;

-- 语音存储策略：已认证用户可读写自己的文件
create policy "voice_recordings_auth_read" on storage.objects
  for select using (
    bucket_id = 'voice-recordings'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "voice_recordings_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'voice-recordings'
    and auth.role() = 'authenticated'
  );

create policy "voice_recordings_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'voice-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
