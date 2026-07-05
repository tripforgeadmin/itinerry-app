-- 0017: nickname is a distinct attribute from the (now-retained-but-unused) full_name.
-- New submissions store the customer's ชื่อเล่น here; full_name/first_name/last_name are
-- kept for historical rows but no longer written.
alter table public.account add column if not exists nickname text;

-- form label follows suit (runtime-merged over code by /api/questions)
update public.visa_questionnaire
set question_text_th = 'ชื่อเล่น', question_text_en = 'Nickname'
where legacy_id = 'q3';
