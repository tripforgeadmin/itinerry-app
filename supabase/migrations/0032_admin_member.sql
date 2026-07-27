-- 0032: per-member admin identity — the first real identity in the system.
--
-- Until now the whole team shared one ADMIN_PASSWORD and mutations were attributed
-- only to free-text labels (contact_log.staff, manual_entry_staff, sales_person).
-- admin_member gives each teammate their own credential, used (for now) only by the
-- MCP OAuth login (/oauth/authorize): claude.ai walks each member through that page,
-- so every MCP token — and every mcp_audit_log row — carries who did it.
-- The admin UI keeps the shared password for the moment; migrating it to per-member
-- login is a planned follow-up on top of this table.
--
-- passcode_hash format: scrypt$N$r$p$<salt_b64>$<hash_b64> (node:crypto scrypt,
-- verified with timingSafeEqual in lib/oauth/crypto.ts). role is plain text with an
-- app allow-list ('member'), per repo convention. Deactivate (active=false) rather
-- than delete — audit rows reference members.
--
-- Seeding (no UI): generate a hash locally, then insert via SQL editor:
--   node -e "const c=require('crypto');const s=c.randomBytes(16);const pw=process.argv[1];
--     console.log(['scrypt',16384,8,1,s.toString('base64'),
--     c.scryptSync(pw,s,32,{N:16384,r:8,p:1}).toString('base64')].join('$'))" 'รหัสผ่าน'
--   insert into admin_member (email, name, passcode_hash) values ('a@b.co', 'ชื่อ', '<hash>');

create table if not exists public.admin_member (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text not null,
  passcode_hash text not null,
  role          text not null default 'member',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.admin_member enable row level security;
alter table public.admin_member force row level security;
