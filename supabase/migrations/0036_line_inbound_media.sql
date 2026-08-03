-- 0036: Inbound LINE media — customer-sent images/video/audio/files are only downloadable
-- from LINE for a limited time and never retrievable retroactively, so the webhook grabs
-- the binary immediately and parks it in a PRIVATE storage bucket. line_message_log rows
-- point at the stored object; the admin timeline reads it back via short-lived signed URLs.
--
-- Bucket is private (unlike result-images): inbound media is customer PII — bank books,
-- passports, ID cards — and must never be publicly addressable.

insert into storage.buckets (id, name, public)
values ('line-media', 'line-media', false)
on conflict (id) do nothing;

-- No storage.objects policies on purpose: private bucket + no policies = service-role only.

alter table public.line_message_log
  add column if not exists media_path text,   -- object path inside the line-media bucket
  add column if not exists media_type text;   -- MIME type as reported by LINE's content API
