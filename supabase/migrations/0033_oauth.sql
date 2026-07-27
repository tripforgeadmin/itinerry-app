-- 0033: minimal OAuth 2.1 authorization-server state, for the claude.ai / Claude
-- Code MCP connector (see lib/oauth/*). Clients are a code-level registry
-- (lib/oauth/clients.ts) — no client table because there is no DCR.
--
-- Both tables store only SHA-256 hashes of the secrets they index (a DB leak must
-- not yield usable codes/tokens). Codes: 5-minute TTL, single-use; a reused code
-- revokes tokens issued from it. Refresh tokens rotate on every use (replaced_by
-- chain); reuse of a rotated token revokes the whole chain.

create table if not exists public.oauth_code (
  code_hash      text primary key,
  client_id      text not null,
  member_id      uuid not null references public.admin_member(id) on delete cascade,
  code_challenge text not null,          -- PKCE S256 challenge
  redirect_uri   text not null,
  resource       text,
  expires_at     timestamptz not null,
  used_at        timestamptz
);

create table if not exists public.oauth_refresh_token (
  token_hash   text primary key,
  member_id    uuid not null references public.admin_member(id) on delete cascade,
  client_id    text not null,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  replaced_by  text,                     -- token_hash of the successor (rotation chain)
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists oauth_refresh_member_idx on public.oauth_refresh_token (member_id);

alter table public.oauth_code enable row level security;
alter table public.oauth_code force row level security;
alter table public.oauth_refresh_token enable row level security;
alter table public.oauth_refresh_token force row level security;
