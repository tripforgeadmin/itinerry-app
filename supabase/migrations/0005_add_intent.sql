-- =====================================================================
-- 0005 — Add the "intent" field captured on the final step (q38): what kind of
-- visa help the user needs (explore / ready / execute). Assessment-level.
-- Additive; applied to the live DB via Supabase MCP.
-- =====================================================================
alter table public.user_assessment add column if not exists intent text;
