-- 0034: MCP tool-call journal — every call Claude makes through the connector,
-- attributed to the authenticated admin_member (the identity 0032 introduced).
-- outcome: 'ok' | 'error' | 'denied' | 'preview' (two-phase send tools log their
-- preview step too). Append-only; reviewed by humans, never surfaced to MCP.

create table if not exists public.mcp_audit_log (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references public.admin_member(id) on delete set null,
  member_name text not null,
  tool        text not null,
  args        jsonb,
  outcome     text not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists mcp_audit_created_idx on public.mcp_audit_log (created_at);

alter table public.mcp_audit_log enable row level security;
alter table public.mcp_audit_log force row level security;
