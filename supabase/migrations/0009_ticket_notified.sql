-- 0009: delivery ledger for the ticket thank-you message.
-- Set when the message is actually delivered — by the submit-time push (friends) or by the
-- follow-webhook reply (users who add the OA later). NULL = never sent yet.

alter table public.user_assessment
  add column if not exists ticket_notified_at timestamptz;
