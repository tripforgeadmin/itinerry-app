-- 0037: Deleting a broadcast rule cascades to its runs (0035), but line_message_log rows
-- kept a plain FK to broadcast_run — so any rule that had actually sent messages could
-- never be deleted ("violates foreign key constraint line_message_log_broadcast_run_id_fkey").
--
-- The message log is the audit trail of what customers really received; it must outlive
-- rule/run cleanup. Re-point the FK with ON DELETE SET NULL: the log row stays, only the
-- link to the deleted run is cleared.

alter table public.line_message_log
  drop constraint line_message_log_broadcast_run_id_fkey;

alter table public.line_message_log
  add constraint line_message_log_broadcast_run_id_fkey
  foreign key (broadcast_run_id) references public.broadcast_run(id) on delete set null;
