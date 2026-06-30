-- =====================================================================
-- 0003: Seed visa_questionnaire — 37 questions from Google Form
-- question_key = semantic name used in branch_answers JSONB
-- legacy_id    = original q-number in questions.ts
-- =====================================================================

insert into public.visa_questionnaire
  (question_key, legacy_id, question_text_th, question_text_en, question_type, section, display_order, options)
values

-- S0: Consent
('consent', 'q2', 'ข้าพเจ้าขอรับรองว่าข้อมูลทั้งหมดในแบบฟอร์มนี้เป็นความจริงและถูกต้องทุกประการ', 'I certify that all information in this form is true and accurate.', 'consent', 'S0', 1, null),

-- S1: Personal Info
('full_name',    'q3', 'ชื่อ-นามสกุล',                            'Full Name',                  'text',  'S1', 2, null),
('nationality',  'q4', 'สัญชาติ',                                   'Nationality',                'radio', 'S1', 3,
  '[{"value":"thai","label_th":"ไทย","label_en":"Thai","emoji":"🇹🇭"},{"value":"other","label_th":"อื่นๆ","label_en":"Other","emoji":"🌍"}]'::jsonb),
('phone',        'q5', 'เบอร์โทรศัพท์',                             'Phone Number',               'tel',   'S1', 4, null),
('email',        'q6', 'อีเมล (สำหรับรับเอกสารตอนให้บริการ)',      'Email (for receiving documents)', 'email', 'S1', 5, null),
('source',       'q7', 'รู้จัก itinerry จากช่องทางไหน?',           'How did you find us?',       'radio', 'S1', 6,
  '[{"value":"facebook","label_th":"Facebook","label_en":"Facebook","emoji":"📘"},{"value":"instagram","label_th":"Instagram","label_en":"Instagram","emoji":"📸"},{"value":"tiktok","label_th":"TikTok","label_en":"TikTok","emoji":"🎵"},{"value":"google","label_th":"Google","label_en":"Google","emoji":"🔍"},{"value":"referral","label_th":"เพื่อนแนะนำ","label_en":"Referral","emoji":"👥"},{"value":"other","label_th":"อื่นๆ","label_en":"Other","emoji":"✨"}]'::jsonb),

-- S2: Destination + Visa Type
('destination', 'q8', 'ประเทศที่ต้องการยื่นวีซ่า', 'Destination Country', 'dropdown', 'S2', 7,
  '[{"value":"schengen","label_th":"Schengen / ยุโรป","label_en":"Schengen / Europe","emoji":"🇪🇺"},{"value":"uk","label_th":"United Kingdom","label_en":"United Kingdom","emoji":"🇬🇧"},{"value":"usa","label_th":"United States","label_en":"United States","emoji":"🇺🇸"},{"value":"canada","label_th":"Canada","label_en":"Canada","emoji":"🇨🇦"},{"value":"australia","label_th":"Australia","label_en":"Australia","emoji":"🇦🇺"},{"value":"nz","label_th":"New Zealand","label_en":"New Zealand","emoji":"🇳🇿"},{"value":"japan","label_th":"Japan","label_en":"Japan","emoji":"🇯🇵"},{"value":"korea","label_th":"South Korea","label_en":"South Korea","emoji":"🇰🇷"},{"value":"china","label_th":"China","label_en":"China","emoji":"🇨🇳"},{"value":"taiwan","label_th":"Taiwan","label_en":"Taiwan","emoji":"🇹🇼"},{"value":"india","label_th":"India","label_en":"India","emoji":"🇮🇳"},{"value":"dubai","label_th":"Dubai / UAE","label_en":"Dubai / UAE","emoji":"🇦🇪"},{"value":"saudi","label_th":"Saudi Arabia","label_en":"Saudi Arabia","emoji":"🇸🇦"},{"value":"qatar","label_th":"Qatar","label_en":"Qatar","emoji":"🇶🇦"},{"value":"other","label_th":"อื่นๆ","label_en":"Others","emoji":"🌍"}]'::jsonb),
('visa_type', 'q9', 'ประเภทวีซ่าที่ต้องการ', 'Visa Type', 'radio', 'S2', 8,
  '[{"value":"tourist","label_th":"วีซ่าท่องเที่ยว","label_en":"Tourist","emoji":"🏖️"},{"value":"visitor","label_th":"วีซ่าเยี่ยมเยียน","label_en":"Visitor","emoji":"👨‍👩‍👧"},{"value":"business","label_th":"วีซ่าธุรกิจ","label_en":"Business","emoji":"🤝"},{"value":"student","label_th":"วีซ่านักเรียน","label_en":"Student","emoji":"🎓"}]'::jsonb),

-- S2A: Tourist Visa
('tourist_arrival',         'q10', 'วันที่วางแผนเดินทาง (วันแรกที่ถึงปลายทาง)',             'Planned Arrival Date',             'date',          'S2A', 9,  null),
('tourist_return',          'q11', 'วันที่วางแผนกลับ (วันที่ออกจากประเทศปลายทาง)',          'Planned Return Date',              'date',          'S2A', 10, null),
('tourist_previous_visas',  'q12', 'เคยได้รับวีซ่าประเทศเหล่านี้ภายใน 5 ปีที่ผ่านมาไหม?', 'Visas received in last 5 years?',  'multiCheckbox', 'S2A', 11,
  '[{"value":"never","label_th":"ไม่เคย","label_en":"Never"},{"value":"uk","label_th":"UK","label_en":"UK","emoji":"🇬🇧"},{"value":"schengen","label_th":"Schengen","label_en":"Schengen","emoji":"🇪🇺"},{"value":"usa","label_th":"USA","label_en":"USA","emoji":"🇺🇸"},{"value":"canada","label_th":"Canada","label_en":"Canada","emoji":"🇨🇦"},{"value":"australia","label_th":"Australia","label_en":"Australia","emoji":"🇦🇺"},{"value":"nz","label_th":"New Zealand","label_en":"New Zealand","emoji":"🇳🇿"},{"value":"japan","label_th":"Japan","label_en":"Japan","emoji":"🇯🇵"},{"value":"korea","label_th":"S. Korea","label_en":"S. Korea","emoji":"🇰🇷"},{"value":"china","label_th":"China","label_en":"China","emoji":"🇨🇳"},{"value":"dubai","label_th":"Dubai / UAE","label_en":"Dubai / UAE","emoji":"🇦🇪"}]'::jsonb),

-- S2B: Visitor Visa
('visitor_arrival',         'q13', 'วันที่วางแผนเดินทาง (วันแรกที่ถึงปลายทาง)',             'Planned Arrival Date',             'date',  'S2B', 12, null),
('visitor_host_status',     'q14', 'คนที่คุณจะไปเยี่ยมมีสถานะอะไรในประเทศนั้น?',          'Immigration status of host?',      'radio', 'S2B', 13,
  '[{"value":"citizen_pr","label_th":"Citizen / PR","label_en":"Citizen / PR","emoji":"🏠"},{"value":"work_visa","label_th":"Work Visa","label_en":"Work Visa","emoji":"💼"},{"value":"student_visa","label_th":"Student Visa","label_en":"Student Visa","emoji":"🎓"},{"value":"not_sure","label_th":"ไม่แน่ใจ","label_en":"Not sure","emoji":"❓"}]'::jsonb),
('visitor_relationship',    'q15', 'ผู้เชิญมีความสัมพันธ์รูปแบบใดกับคุณ?',                'Relationship with host?',          'radio', 'S2B', 14,
  '[{"value":"family","label_th":"ครอบครัว","label_en":"Family","emoji":"👨‍👩‍👧"},{"value":"relative","label_th":"ญาติ","label_en":"Relative","emoji":"👪"},{"value":"married","label_th":"คู่สมรส (จดทะเบียน)","label_en":"Spouse (married)","emoji":"💍"},{"value":"partner","label_th":"แฟน","label_en":"Partner","emoji":"❤️"},{"value":"friend","label_th":"เพื่อน","label_en":"Friend","emoji":"👥"}]'::jsonb),
('visitor_host_documents',  'q16', 'เอกสารที่ผู้เชิญสามารถส่งให้คุณได้',                   'Documents host can provide',       'multiCheckbox', 'S2B', 15,
  '[{"value":"invitation_letter","label_th":"จดหมายเชิญ","label_en":"Invitation Letter","emoji":"📝"},{"value":"house_cert","label_th":"หลักฐานที่พัก","label_en":"House Certificate","emoji":"🏠"},{"value":"job_cert","label_th":"จดหมายรับรองงาน","label_en":"Job Certificate","emoji":"💼"},{"value":"bank_stmt","label_th":"รายการเดินบัญชี 6 เดือน","label_en":"Bank Statement 6m","emoji":"💳"},{"value":"none","label_th":"ไม่มีเลย","label_en":"None","emoji":"➖"}]'::jsonb),

-- S2C: Business Visa
('business_arrival',          'q17', 'วันที่วางแผนเดินทาง (วันแรกที่ถึงปลายทาง)',             'Planned Arrival Date',             'date',          'S2C', 16, null),
('business_return',           'q18', 'วันที่วางแผนกลับ (วันที่ออกจากประเทศปลายทาง)',          'Planned Return Date',              'date',          'S2C', 17, null),
('business_invitation_letter','q19', 'มีหนังสือเชิญ (Invitation Letter) จากบริษัทในประเทศปลายทางไหม?', 'Have Invitation Letter?', 'radio', 'S2C', 18,
  '[{"value":"yes","label_th":"มีแล้ว","label_en":"Yes","emoji":"✅"},{"value":"requesting","label_th":"กำลังจะขอ","label_en":"Requesting soon","emoji":"⏳"},{"value":"not_required","label_th":"ไม่ต้องการ","label_en":"Not required","emoji":"➖"}]'::jsonb),
('business_previous_visas',   'q20', 'เคยได้รับวีซ่าประเทศเหล่านี้ภายใน 5 ปีที่ผ่านมาไหม?', 'Visas received in last 5 years?',  'multiCheckbox', 'S2C', 19,
  '[{"value":"never","label_th":"ไม่เคย","label_en":"Never"},{"value":"uk","label_th":"UK","label_en":"UK","emoji":"🇬🇧"},{"value":"schengen","label_th":"Schengen","label_en":"Schengen","emoji":"🇪🇺"},{"value":"usa","label_th":"USA","label_en":"USA","emoji":"🇺🇸"},{"value":"canada","label_th":"Canada","label_en":"Canada","emoji":"🇨🇦"},{"value":"australia","label_th":"Australia","label_en":"Australia","emoji":"🇦🇺"},{"value":"nz","label_th":"New Zealand","label_en":"New Zealand","emoji":"🇳🇿"},{"value":"japan","label_th":"Japan","label_en":"Japan","emoji":"🇯🇵"},{"value":"korea","label_th":"S. Korea","label_en":"S. Korea","emoji":"🇰🇷"},{"value":"china","label_th":"China","label_en":"China","emoji":"🇨🇳"},{"value":"dubai","label_th":"Dubai / UAE","label_en":"Dubai / UAE","emoji":"🇦🇪"}]'::jsonb),

-- S2D: Student Visa
('student_study_start',    'q21', 'วันที่วางแผนเริ่มเรียน (วันแรกที่เริ่มเรียน)',  'Planned Study Start Date',               'date',  'S2D', 20, null),
('student_acceptance_letter','q22','ได้รับ Acceptance Letter จากสถาบันแล้วไหม?', 'Have Acceptance Letter?',                 'radio', 'S2D', 21,
  '[{"value":"received","label_th":"ได้รับแล้ว","label_en":"Yes, received","emoji":"✅"},{"value":"in_progress","label_th":"อยู่ระหว่างสมัคร","label_en":"Application in progress","emoji":"⏳"},{"value":"not_applied","label_th":"ยังไม่ได้สมัคร","label_en":"Not yet applied","emoji":"📝"}]'::jsonb),
('student_expense_sponsor', 'q23', 'ใครเป็นผู้รับผิดชอบค่าใช้จ่ายในการเรียน?',  'Who sponsors study expenses?',           'radio', 'S2D', 22,
  '[{"value":"self","label_th":"ตัวเอง","label_en":"Self","emoji":"👤"},{"value":"parents","label_th":"พ่อแม่","label_en":"Parents","emoji":"👨‍👩‍👧"},{"value":"scholarship","label_th":"ทุนการศึกษา","label_en":"Scholarship","emoji":"🏆"},{"value":"other","label_th":"อื่นๆ","label_en":"Other","emoji":"✨"}]'::jsonb),

-- S3: Occupation
('occupation', 'q24', 'อาชีพปัจจุบันของคุณคืออะไร?', 'What is your current occupation?', 'radio', 'S3', 23,
  '[{"value":"employee","label_th":"พนักงานประจำ","label_en":"Employee","emoji":"🏢"},{"value":"government","label_th":"ข้าราชการ","label_en":"Government Officer","emoji":"🏛️"},{"value":"freelance","label_th":"Freelance / อิสระ","label_en":"Freelance","emoji":"💻"},{"value":"business_owner","label_th":"เจ้าของธุรกิจ","label_en":"Business Owner","emoji":"🏪"},{"value":"retired","label_th":"เกษียณอายุ","label_en":"Retired","emoji":"🌿"},{"value":"homemaker","label_th":"แม่บ้าน","label_en":"Homemaker","emoji":"🏠"},{"value":"student_occ","label_th":"นักเรียน/นักศึกษา","label_en":"Student","emoji":"🎓"}]'::jsonb),

-- S4A: Employee / Government
('employee_work_letter', 'q25', 'มีหนังสือรับรองงานที่ระบุ ตำแหน่ง + เงินเดือน + วันลาไหม?', 'Employment Letter with position, salary, approved leave?', 'radio', 'S4A', 24,
  '[{"value":"complete","label_th":"มีครบ","label_en":"Yes, complete","emoji":"✅"},{"value":"partial","label_th":"มีแต่ไม่ครบ","label_en":"Partial","emoji":"⚠️"},{"value":"none","label_th":"ยังไม่มี","label_en":"Not yet","emoji":"❌"}]'::jsonb),

-- S4B: Freelance
('freelance_income_proof', 'q26', 'มีเอกสารพิสูจน์รายได้ไหม? (สัญญา / Invoice / Bank Transfer)', 'Income proof? (Contract / Invoice / Bank Transfer)', 'radio', 'S4B', 25,
  '[{"value":"all_three","label_th":"มีครบทั้งสามอย่าง","label_en":"Have all three","emoji":"✅"},{"value":"partial","label_th":"มีบางส่วน","label_en":"Partial","emoji":"⚠️"},{"value":"none","label_th":"ไม่มีเลย","label_en":"None","emoji":"❌"}]'::jsonb),
('freelance_tax_history', 'q27', 'มีเอกสารชำระภาษีย้อนหลัง 3 ปีไหม?', 'Tax documents for last 3 years?', 'radio', 'S4B', 26,
  '[{"value":"all_3y","label_th":"มีครบ 3 ปี","label_en":"Have all 3 years","emoji":"✅"},{"value":"partial","label_th":"มีบางส่วน","label_en":"Partial","emoji":"⚠️"},{"value":"none","label_th":"ไม่มีเลย","label_en":"None","emoji":"❌"}]'::jsonb),

-- S4C: Business Owner
('business_registration', 'q28', 'มีหนังสือรับรองบริษัท (DBD) หรือเอกสารจดทะเบียนธุรกิจไหม?', 'Company Registration Certificate (DBD)?', 'radio', 'S4C', 27,
  '[{"value":"yes","label_th":"มีแล้ว","label_en":"Yes","emoji":"✅"},{"value":"no","label_th":"ยังไม่มี","label_en":"Not yet","emoji":"❌"}]'::jsonb),

-- S4D: Retired / Homemaker / Student Occ
('dependent_expense_sponsor', 'q29', 'ใครเป็นผู้รับผิดชอบค่าใช้จ่ายในการเดินทาง?', 'Who sponsors travel expenses?', 'radio', 'S4D', 28,
  '[{"value":"parents","label_th":"พ่อแม่","label_en":"Parents","emoji":"👨‍👩‍👧"},{"value":"spouse","label_th":"คู่สมรส","label_en":"Spouse","emoji":"💍"},{"value":"self_savings","label_th":"ตัวเอง (มีเงินออม)","label_en":"Self (savings)","emoji":"💰"},{"value":"employer","label_th":"บริษัท","label_en":"Employer","emoji":"🏢"},{"value":"other","label_th":"อื่นๆ","label_en":"Other","emoji":"✨"}]'::jsonb),

-- S5: Core Qualification
('visa_refused',         'q30', 'เคยถูกปฏิเสธวีซ่าจากประเทศใดไหม?',                              'Ever been refused a visa?',              'radio', 'S5', 29,
  '[{"value":"never","label_th":"ไม่เคย","label_en":"Never","emoji":"✅"},{"value":"yes","label_th":"เคย","label_en":"Yes","emoji":"⚠️"}]'::jsonb),
('visa_refused_details', 'q31', 'ระบุประเทศและปีที่ถูกปฏิเสธวีซ่า',                               'Specify country and year of refusal',    'text',  'S5', 30, null),
('overstayed',           'q32', 'เคยอยู่ในประเทศใดเกินกำหนดวีซ่า (Overstay) ไหม?',               'Ever overstayed a visa?',                'radio', 'S5', 31,
  '[{"value":"never","label_th":"ไม่เคย","label_en":"Never","emoji":"✅"},{"value":"yes","label_th":"เคย","label_en":"Yes","emoji":"⚠️"}]'::jsonb),
('overstay_details',     'q33', 'ระบุประเทศ ระยะเวลา และปีที่เกิด Overstay',                       'Specify country, duration, and year',    'text',  'S5', 32, null),
('savings_balance',      'q34', 'ยอดเงินในบัญชีออมทรัพย์ปัจจุบันประมาณเท่าไหร่?',                 'Approximate savings balance?',           'radio', 'S5', 33,
  '[{"value":"under50k","label_th":"น้อยกว่า 50,000 บาท","label_en":"< 50K THB","emoji":"💸"},{"value":"50k_150k","label_th":"50,000–150,000 บาท","label_en":"50–150K THB","emoji":"💰"},{"value":"150k_300k","label_th":"150,000–300,000 บาท","label_en":"150–300K THB","emoji":"💰"},{"value":"over300k","label_th":"มากกว่า 300,000 บาท","label_en":"> 300K THB","emoji":"💎"}]'::jsonb),
('ties_thailand',        'q35', 'ความผูกพันกับประเทศไทย (เลือกได้มากกว่า 1)',                       'Ties to Thailand (select all that apply)', 'multiCheckbox', 'S5', 34,
  '[{"value":"job","label_th":"งานประจำหรือธุรกิจในไทย","label_en":"Job or business in Thailand","emoji":"💼"},{"value":"property","label_th":"บ้าน/คอนโด/ที่ดินในไทย","label_en":"Own property in Thailand","emoji":"🏠"},{"value":"spouse_children","label_th":"คู่สมรสหรือบุตรอยู่ในไทย","label_en":"Spouse or children in Thailand","emoji":"👨‍👩‍👧"},{"value":"dependents","label_th":"พ่อแม่หรือผู้ที่ต้องดูแลในไทย","label_en":"Dependents in Thailand","emoji":"👴"},{"value":"investments","label_th":"เงินลงทุนหรือทรัพย์สินอื่น","label_en":"Investments or other assets","emoji":"📈"},{"value":"none","label_th":"ไม่มีข้อใดข้างต้น","label_en":"None of the above","emoji":"➖"}]'::jsonb),

-- S6: Contact Preference
('contact_preference', 'q36', 'ต้องการให้เราติดต่อกลับทางไหน?', 'How to contact you?', 'radio', 'S6', 35,
  '[{"value":"line","label_th":"ผ่าน LINE OA @itinerry","label_en":"Via LINE OA @itinerry","emoji":"💬"},{"value":"call","label_th":"ให้โทรกลับ","label_en":"Call me back","emoji":"📱"}]'::jsonb),

-- S7: Callback Time
('callback_time', 'q37', 'ช่วงเวลาที่ต้องการให้ติดต่อกลับ', 'Preferred callback time', 'radio', 'S7', 36,
  '[{"value":"morning","label_th":"เช้า 9:00–12:00","label_en":"Morning 9:00–12:00","emoji":"🌅"},{"value":"afternoon","label_th":"บ่าย 12:00–15:00","label_en":"Afternoon 12:00–15:00","emoji":"☀️"},{"value":"evening","label_th":"เย็น 15:00–18:00","label_en":"Evening 15:00–18:00","emoji":"🌆"}]'::jsonb);
