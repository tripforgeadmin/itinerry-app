-- 0031: durable rate limiting.
--
-- The old limiter (lib/rateLimit.ts) was an in-process Map — per-instance and reset
-- on every cold start, i.e. decorative on Vercel serverless. This moves the counter
-- into Postgres behind one atomic SECURITY DEFINER function (same idiom as
-- next_ticket_number/next_quote_number): fixed window, upsert-and-increment in a
-- single statement so concurrent requests can't double-spend the window.
-- Used by: admin login, OAuth authorize/token, the MCP tool layer (per member),
-- and /api/submit (per IP).

create table if not exists public.rate_limit (
  key          text primary key,        -- e.g. 'admin_login:1.2.3.4', 'mcp:<member_id>'
  window_start timestamptz not null,
  count        integer not null default 1
);

alter table public.rate_limit enable row level security;
alter table public.rate_limit force row level security;

create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_sec integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare c integer;
begin
  insert into rate_limit as rl (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when rl.window_start < now() - make_interval(secs => p_window_sec)
                 then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_sec)
                        then now() else rl.window_start end
  returning count into c;
  return c <= p_max;
end $$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
