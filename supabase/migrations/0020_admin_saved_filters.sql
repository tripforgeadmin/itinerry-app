-- 0019: saved/favorite admin list filters. GLOBAL (shared) by design — this admin tool
-- has no per-user identity (single shared ADMIN_PASSWORD, no admin_user table; see
-- app/api/admin/login/route.ts, which signs { role: "admin" } only). Multi-account auth
-- is out of scope; do not add a created_by/owner column speculatively.
create table public.admin_saved_filters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  conditions  jsonb not null,       -- FilterCondition[] (lib/admin-filters.ts), validated app-side only
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_admin_saved_filters_favorite on public.admin_saved_filters (is_favorite, created_at desc);

-- Same RLS posture as every admin-adjacent table in this codebase: deny-by-default,
-- service-role (used by app/api/admin/* routes via lib/supabase.ts) bypasses RLS entirely.
alter table public.admin_saved_filters enable row level security;
alter table public.admin_saved_filters force  row level security;
