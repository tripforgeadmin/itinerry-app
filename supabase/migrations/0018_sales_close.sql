-- 0018: Salesforce-style Closed Won / Closed Lost — close date, loss reason taxonomy, reopen.

-- Reconcile a repo↔DB divergence: app_config is used since 0013 but was never created in a
-- migration (only in the live DB). This makes a fresh build complete; no-op on the live DB.
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
alter table public.app_config force row level security;

-- Sales-close fields on the assessment (the "opportunity").
alter table public.user_assessment
  add column if not exists close_date        date,
  add column if not exists lost_reason_l1    text,
  add column if not exists lost_reason_l2    text,
  add column if not exists close_notes       text,
  add column if not exists won_service_type  text;  -- 'full' | 'diy'

-- Snapshot the reason on the transition row so the timeline survives a reopen (which clears
-- the columns above).
alter table public.status_history add column if not exists note text;

-- Admin-managed 2-level loss-reason taxonomy (one self-referential table).
create table if not exists public.lost_reason_option (
  key        text primary key,
  parent_key text references public.lost_reason_option(key) on delete cascade,  -- null = L1 category
  label_th   text not null,
  label_en   text,
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.lost_reason_option enable row level security;
alter table public.lost_reason_option force row level security;

-- Seed the taxonomy from docs/design/Event Tracking Plan.md (deal_closed_lost {reason_l1, reason_l2}),
-- plus no_decision→no_response (= ghosted, per owner decision).
insert into public.lost_reason_option (key, parent_key, label_th, label_en, sort_order) values
  ('price', null, 'ราคา', 'Price', 10),
  ('competitor', null, 'คู่แข่ง', 'Competitor', 20),
  ('internal_customer', null, 'ตัวลูกค้าเอง', 'Customer-internal', 30),
  ('service_gaps', null, 'บริการไม่ครอบคลุม', 'Service gaps', 40),
  ('time', null, 'เรื่องเวลา', 'Timing', 50),
  ('expert_execution', null, 'การบริการของเรา', 'Our service', 60),
  ('no_decision', null, 'ยังไม่ตัดสินใจ', 'No decision', 70),

  ('budget_constraint', 'price', 'งบไม่พอ', 'Budget constraint', 10),
  ('poor_value_perception', 'price', 'รู้สึกไม่คุ้มค่า', 'Poor value perception', 20),
  ('inflexible_payment_terms', 'price', 'เงื่อนไขชำระเงินไม่ยืดหยุ่น', 'Inflexible payment terms', 30),

  ('cheaper_price', 'competitor', 'เจ้าอื่นถูกกว่า', 'Cheaper elsewhere', 10),
  ('guarantee_refund_claim', 'competitor', 'เจ้าอื่นการันตี/คืนเงิน', 'Guarantee/refund claim', 20),
  ('bundling_disadvantage', 'competitor', 'แพ็กเกจเราด้อยกว่า', 'Bundling disadvantage', 30),

  ('self_made_all', 'internal_customer', 'ทำเองทั้งหมด', 'Self-made all', 10),
  ('free_alternative_friends', 'internal_customer', 'มีทางเลือกฟรี/เพื่อนช่วย', 'Free alternative/friends', 20),
  ('friends_relatives_veto', 'internal_customer', 'คนรอบข้างค้าน', 'Friends/relatives veto', 30),

  ('coverage_gap', 'service_gaps', 'ไม่รองรับประเภทวีซ่า/ประเทศ', 'Coverage gap', 10),
  ('missing_addons', 'service_gaps', 'ขาดบริการเสริมที่ต้องการ', 'Missing add-ons', 20),

  ('insufficient_lead_time', 'time', 'เวลากระชั้นเกินไป', 'Insufficient lead time', 10),
  ('no_appointment_slot', 'time', 'ไม่มีคิวนัด', 'No appointment slot', 20),

  ('slow_response', 'expert_execution', 'ตอบช้า', 'Slow response', 10),
  ('no_follow_up', 'expert_execution', 'ไม่ได้ติดตาม', 'No follow-up', 20),
  ('unclear_info', 'expert_execution', 'ข้อมูลไม่ชัดเจน', 'Unclear info', 30),
  ('perceived_lack_of_expertise', 'expert_execution', 'ดูไม่เชี่ยวชาญพอ', 'Perceived lack of expertise', 40),
  ('high_friction_onboarding', 'expert_execution', 'ขั้นตอนยุ่งยาก', 'High-friction onboarding', 50),
  ('too_bot_like', 'expert_execution', 'คุยเหมือนบอทเกินไป', 'Too bot-like', 60),

  ('trip_postponed', 'no_decision', 'เลื่อนทริป', 'Trip postponed', 10),
  ('trip_cancelled', 'no_decision', 'ยกเลิกทริป', 'Trip cancelled', 20),
  ('indecision', 'no_decision', 'ลังเล/ยังไม่ตัดสินใจ', 'Indecision', 30),
  ('price_shopping', 'no_decision', 'เทียบราคาหลายเจ้า', 'Price shopping', 40),
  ('no_response', 'no_decision', 'เงียบหาย/ไม่ตอบ (ghosted)', 'No response (ghosted)', 50)
on conflict (key) do nothing;
