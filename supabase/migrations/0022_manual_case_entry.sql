-- 0022: OPS manual case entry — mark cases staff key in by hand (phone-first customers
-- who never touched the app), and record which staff member took the call. Plain text
-- columns, no DB-level enum/check — consistent with this repo's status-column convention
-- (see 0002, 0010): validate the small allow-list in application code, not in Postgres.

alter table public.user_assessment
  add column if not exists entry_source text not null default 'app';
  -- 'app' (default, existing + real submit-route rows) | 'manual' (OPS phone entry).
  -- Validated in app/api/admin/manual-case/route.ts; no check constraint by convention.

alter table public.user_assessment
  add column if not exists manual_entry_staff text;
  -- Free-text staff name OPS types in when creating a manual case. NOT authentication —
  -- there is no per-admin login (single shared ADMIN_PASSWORD) — just a label for whoever
  -- reviews the case later. Null for entry_source='app' rows.

create index if not exists idx_user_assessment_entry_source on public.user_assessment (entry_source);
