-- =====================================================================
-- 0004: Audit log — PDPA compliance trail
-- =====================================================================
-- Tracks every INSERT / UPDATE / DELETE on account, user_trip,
-- and user_assessment so changes to personal data are traceable.
-- =====================================================================

-- ─── Table ───────────────────────────────────────────────────────────
create table public.audit_log (
  id          uuid        primary key default gen_random_uuid(),
  table_name  text        not null,
  record_id   uuid        not null,
  action      text        not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  actor       text        not null default 'system',
  created_at  timestamptz not null default now()
);

create index audit_log_record_idx    on public.audit_log (record_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- Only service-role can read (bypasses RLS); anon/authenticated cannot
alter table public.audit_log enable row level security;

-- ─── Trigger function ────────────────────────────────────────────────
create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (table_name, record_id, action, old_data, new_data)
  values (
    TG_TABLE_NAME,
    case TG_OP
      when 'DELETE' then OLD.id
      else NEW.id
    end,
    TG_OP,
    case TG_OP when 'INSERT' then null else to_jsonb(OLD) end,
    case TG_OP when 'DELETE' then null else to_jsonb(NEW) end
  );
  return null;
end;
$$;

-- ─── Attach to tables with personal data ─────────────────────────────
create trigger trg_audit_account
  after insert or update or delete on public.account
  for each row execute function public.fn_audit_log();

create trigger trg_audit_user_trip
  after insert or update or delete on public.user_trip
  for each row execute function public.fn_audit_log();

create trigger trg_audit_user_assessment
  after insert or update or delete on public.user_assessment
  for each row execute function public.fn_audit_log();
