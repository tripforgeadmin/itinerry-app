-- 0015: outbound LINE message log — every message the system/admin pushes to a customer.
-- Scoped to the CUSTOMER (account_id); assessment_id tags which ticket it related to.
create table public.line_message_log (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.account(id),
  assessment_id uuid references public.user_assessment(id),
  kind          text not null, -- ticket_received | follow_up | share_card | result | manual
  content       text not null, -- human-readable summary (Flex → short description)
  payload       jsonb,         -- raw LINE message array, for audit
  sent_by       text not null default 'system', -- system | admin
  delivered     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index line_message_log_account_idx on public.line_message_log (account_id, created_at);
alter table public.line_message_log enable row level security;
alter table public.line_message_log force row level security;

-- Backfill: synthesize entries for messages sent before this table existed, from the
-- delivery flags that do exist. Approximate but gives old cases a usable timeline.
insert into public.line_message_log (account_id, assessment_id, kind, content, sent_by, delivered, created_at)
select account_id, id, 'ticket_received',
       '[ย้อนหลัง] แจ้งรับเรื่อง + หมายเลขเคส ' || coalesce(ticket_id, '') || ' + ข้อความติดตามผลใน 24 ชม.',
       'system', true, ticket_notified_at
from public.user_assessment
where ticket_notified_at is not null;

insert into public.line_message_log (account_id, assessment_id, kind, content, sent_by, delivered, created_at)
select account_id, id, 'result', '[ย้อนหลัง] ส่งผลการประเมินให้ลูกค้าทาง LINE', 'admin', true, result_sent_at
from public.user_assessment
where result_sent_at is not null;
