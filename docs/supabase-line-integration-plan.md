# Itinerry — Supabase Schema & LINE Integration: บันทึกการศึกษา + แผนงาน

> เอกสารสรุปสิ่งที่ศึกษาจากโค้ดและเอกสารปัจจุบัน พร้อมแผนสิ่งที่ต้องทำต่อ
> สำหรับ (1) ย้ายการเก็บข้อมูลแบบประเมินไป Supabase และ (2) ใช้ LINE userId ให้ถูกต้อง
>
> อัปเดต: 2026-06-27 · ขอบเขต: ฟอร์มประเมินวีซ่า (37 ข้อ), LINE Login + Add Friend

---

## 1. สรุปสถานะปัจจุบัน (ศึกษาอะไรมาบ้าง)

### 1.1 ฟอร์มแบบประเมิน
- ฟอร์ม **37 คำถาม** มี **branching logic** 3 จุดแยกหลัก (ดู [itinerry_form_logic_tree.mermaid](design/architecture/itinerry_form_logic_tree.mermaid)):
  1. **Q9 ประเภทวีซ่า** → Tourist (Q10–12) / Visitor (Q13–16) / Business (Q17–20) / Student (Q21–23)
  2. **Q24 อาชีพ** → พนักงาน·ข้าราชการ (Q25) / Freelance (Q26–27) / เจ้าของธุรกิจ (Q28) / เกษียณ·แม่บ้าน·นักเรียน (Q29)
  3. **Q36 ช่องทางติดต่อ** → โทรกลับ (Q37) / Add LINE OA
- คำถามคัดกรองหลัก (S5: Q30–Q35) **ทุกคนตอบ** และมีเงื่อนไขย่อย (Q30→Q31, Q32→Q33)
- **Source of truth ของ option values คือ [`lib/questions.ts`](../lib/questions.ts)** (ค่าที่แอปส่งจริง) — ตรงกับ PDF เป็นส่วนใหญ่ แต่ **ไม่ตรง 100%** (ดู §2.3)

### 1.2 การส่งข้อมูล (submit)
- [`app/api/submit/route.ts`](../app/api/submit/route.ts) **POST ไป Google Apps Script** (`APPS_SCRIPT_URL`) → Google Sheets — **ยังไม่มี Supabase**
- payload เป็น **object แบน เปลี่ยนชื่อ key** เช่น `touristArrival`, `visitorHostStatus` (ไม่ใช่ `q10`, `q14`)
- ค่าที่ไม่ตอบส่งเป็น **`""`** (empty string) ไม่ใช่ null
- multi-select (q12/q16/q20/q35) ส่งเป็น **comma-joined string**
- nationality/source ถูก **resolve เป็น free-text** ตั้งแต่ใน route (`q4==='other' ? q4_other : q4`)
- เก็บ `profile.userId` → `lineUserId`, `profile.displayName` → `lineDisplayName` (ไม่ได้ส่ง pictureUrl / isFriend)

### 1.3 LINE Authentication
- [`lib/line.ts`](../lib/line.ts): LINE Login OAuth 2.1, scope `profile openid`, `bot_prompt=aggressive`
- flow: [`/api/auth/login`](../app/api/auth/login/route.ts) → LINE → [`/api/auth/callback`](../app/api/auth/callback/route.ts) → exchange code → `getLineProfile()` (`{userId, displayName, pictureUrl}`) + `checkLineFriendship()` (`/friendship/v1/status`) → session JWT cookie
- OA: `@448yxrvh` ([`lib/constants.ts`](../lib/constants.ts))

### 1.4 Stack
- Next.js 16.2.9 (App Router), React 19, Zustand, jose (JWT) — **ยังไม่มี `@supabase/supabase-js`**

---

## 2. การออกแบบ Supabase Schema

📄 ไฟล์ migration: [`supabase/migrations/0001_visa_assessments.sql`](../supabase/migrations/0001_visa_assessments.sql)

### 2.1 กลยุทธ์ที่เลือก: Hybrid (Core columns + JSONB)
ตารางเดียว `public.visa_assessments` (1 submission = 1 row):
- **Typed column + ENUM** สำหรับฟิลด์ที่ทุกคนตอบ (personal, destination, visa_type, occupation, S5 screening, contact)
- **JSONB `branch_answers`** สำหรับคำตอบเฉพาะ branch ที่ sparse (q12–q29 ที่กระจัดกระจาย)
- **โปรโมต travel dates** (q10/q13/q17 → `travel_arrival`, q11/q18 → `travel_return`, q21 → `study_start`) เป็นคอลัมน์ `date`

| เหตุผล | ทำไมไม่เลือกทางอื่น |
|---|---|
| ฟอร์ม one-shot, low volume → ไม่ต้องกังวล storage ของ NULL | **Wide-table:** ~35 คอลัมน์ส่วนใหญ่ NULL, ต้อง `ALTER` บ่อย |
| ทีมไทยทำ analytics ใน Supabase → ต้อง query คอลัมน์ตรงๆ | **EAV:** ต้อง pivot/JOIN ทุกครั้ง, เสีย type safety, ทีม non-eng เขียน SQL ยาก |

### 2.2 RLS Posture
- เปิด RLS + force, **ไม่มี policy permissive** (deny-by-default)
- เขียนผ่าน **service role** ฝั่ง server (`/api/submit`), anon key อ่าน/เขียนไม่ได้
- เผื่อ staff dashboard ในอนาคต: มี policy ตัวอย่าง (comment ไว้) ผูกกับ JWT claim

### 2.3 ⚠️ ข้อแก้สำคัญจากการ review (สิ่งที่ schema ต้องระวัง)
จากการตรวจ payload จริงใน `submit/route.ts` เทียบกับ PDF — ดราฟต์ schema ที่ "ดูสวย" จะ **reject submission จริงเกือบหมด** ถ้าไม่แก้:

| # | ปัญหา | ความจริง | ทางแก้ |
|---|---|---|---|
| C1 | สมมติ insert เข้า Supabase ได้เลย | route ยิงไป Apps Script, payload แบน+เปลี่ยนชื่อ key | ต้องเขียน route ใหม่ก่อน (§3.2) |
| C2 | `nationality`/`source` เป็น enum NOT NULL | route resolve เป็น free-text แล้ว | route ต้องส่ง `q4`+`q4_other` แยก |
| C3 | multi-select เป็น `text[]` | route ส่ง comma-string | split เป็น array ก่อน insert |
| C4 | enum NOT NULL ทุกคอลัมน์ | route ส่ง `""` สำหรับข้อไม่ตอบ → enum cast พัง | coerce `""`→`NULL` ที่ route |
| S1 | q36 `('line','call')` + q37 enum | ฟอร์ม Google จริงมี "Option 3" (q36) + "Other:" (q37) | เก็บเป็น `text` |
| S2 | `is_friend`/`line_picture_url` | route ปัจจุบันไม่ส่งมา (แต่มีใน session/cookie) | route ต้อง forward |

> ทั้งหมดนี้แก้ลงไฟล์ migration แล้ว — `nationality` ยังเป็น enum (ต้องคู่กับการแก้ route), q36/q37 เป็น `text`, email nullable, multi-select เป็น array/JSONB

### 2.4 ข้อที่ต้องตัดสินใจ (Open decisions)
- [ ] **`nationality`**: enum+`_other` (ปัจจุบัน) หรือเก็บ text ดิบ?
- [ ] **travel dates**: เป็นคอลัมน์ `date` (ปัจจุบัน) หรือทิ้งใน JSONB?
- [ ] **แยกตาราง `line_users`** ไหม? (ตอนนี้ denormalize บน row — พอสำหรับ one-shot form)
- [ ] **ENUM vs lookup table** สำหรับ `destination`/`lead_source` (ถ้าค่าตัวเลือกเปลี่ยนบ่อย → lookup ดีกว่า)
- [ ] แก้ "Option 3" ของ q36 ใน Google Form (data-quality bug)

---

## 3. LINE userId — สิ่งที่ศึกษา + ต้องทำ

### 3.1 ข้อเท็จจริงหลัก (ตรวจกับ developers.line.biz แล้ว)
- `userId` = **`U` + hex 32 ตัว**, ถาวรต่อผู้ใช้
- **scope ตาม provider:** *"If the provider is the same, the user ID is the same regardless of the channel type (LINE Login channel or Messaging API channel)."* ([getting-user-ids](https://developers.line.biz/en/docs/messaging-api/getting-user-ids/))
  - same provider → Login userId == OA webhook `source.userId` → push/map/detect friend ได้
  - คนละ provider → คนละค่า map ไม่ได้
- 🔑 **นอกจาก same provider ต้อง [link OA เข้ากับ LINE Login channel](https://developers.line.biz/en/docs/line-login/link-a-bot/)** ใน Console ด้วย ไม่งั้น `bot_prompt` และ `friendship/v1/status → friendFlag` ใช้กับ OA นี้ไม่ได้
- `bot_prompt=aggressive` = เปิดหน้าจอแยก **หลังหน้า consent** ให้เลือกแอด (เป็นการ *เสนอ* ไม่ใช่บังคับ 100%)

### 3.2 วิธีใช้ userId
1. **primary key ผูก submission** → `upsert by line_user_id` (idempotency)
2. **ส่ง push** → `POST /v2/bot/message/push` ด้วย **channel access token ของ OA** (ไม่ใช่ user token), `to: userId` — ต้อง same-provider + `friendFlag=true`
3. **ผูก OA webhook** → match `event.source.userId` กับ `line_user_id`
4. **identity ที่ปลอดภัยกว่า** → ถอด `sub` จาก `id_token` แล้ว verify ที่ `POST /oauth2/v2.1/verify` แทนเชื่อ `/v2/profile` ลอยๆ

### 3.3 ⚠️ ความเสี่ยงด้านความปลอดภัยที่พบ
- [`lib/line.ts:9-11`](../lib/line.ts) มี **fallback secret** `"fallback-dev-secret-32-chars-long!!"` — ถ้า prod ไม่ตั้ง `LINE_CHANNEL_SECRET` ใครก็ปลอม JWT สวม userId คนอื่นได้
- cookie `isFriend` เป็น `httpOnly:false` → ใช้แค่ปรับ UI ห้ามใช้เป็นเงื่อนไขความปลอดภัย
- `userId` = personal data (PDPA) → เก็บเท่าที่จำเป็น, อย่า leak ออก client

---

## 4. แผนงานที่ต้องทำต่อ (TODO)

### 🔴 P0 — Prerequisite (บล็อกทุกอย่าง)
- [ ] **ยืนยันใน LINE Developers Console** ว่า LINE Login channel กับ Messaging API channel ของ OA `@448yxrvh` อยู่ **provider เดียวกัน** + **link OA เข้ากับ Login channel** แล้ว
- [ ] รัน migration `0001_visa_assessments.sql` บน Supabase + ตั้ง env (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

### 🟠 P1 — เชื่อม Supabase
- [ ] ติดตั้ง `@supabase/supabase-js` + สร้าง `lib/supabase.ts` (server client ด้วย service role)
- [ ] เขียน [`app/api/submit/route.ts`](../app/api/submit/route.ts) ใหม่ให้ insert/upsert เข้า Supabase โดย:
  - coerce `""` → `null`
  - split multi-select string → array
  - ส่ง `q4`/`q4_other`, `q7`/`q7_other` แยก (ไม่ pre-resolve)
  - build `branch_answers` เป็น JSON object keyed by qid
  - forward `pictureUrl` (จาก session) + `isFriend` (จาก cookie)
  - `upsert` by `line_user_id` (idempotency)
- [ ] ตัดสินใจ: เก็บ Apps Script ไว้คู่กัน หรือเลิกใช้

### 🟡 P2 — LINE messaging + security
- [ ] เพิ่ม env `LINE_OA_CHANNEL_ACCESS_TOKEN` + helper ส่ง push ยืนยันผลประเมิน (เช็ค `friendFlag` ก่อนส่ง)
- [ ] แก้ fallback secret ใน `lib/line.ts` → throw ถ้าไม่มี secret ใน production, แยก signing secret ออกจาก channel secret
- [ ] (เสริม) เปลี่ยนไป verify `id_token` เป็น identity หลัก
- [ ] (เสริม) สร้าง endpoint รับ OA webhook → ผูก `source.userId` กับ submission

### 🟢 P3 — ตัดสินใจ schema (ดู §2.4)

---

## 5. ไฟล์อ้างอิง

| ไฟล์ | บทบาท |
|---|---|
| [`supabase/migrations/0001_visa_assessments.sql`](../supabase/migrations/0001_visa_assessments.sql) | schema migration |
| [`lib/questions.ts`](../lib/questions.ts) | source of truth ของ option values |
| [`app/api/submit/route.ts`](../app/api/submit/route.ts) | submit (ต้องเขียนใหม่) |
| [`lib/line.ts`](../lib/line.ts) | LINE auth helpers (จุดแก้ security) |
| [`app/api/auth/callback/route.ts`](../app/api/auth/callback/route.ts) | LINE callback |
| [`lib/constants.ts`](../lib/constants.ts) | OA id, endpoints |
| [`docs/design/architecture/itinerry_form_logic_tree.mermaid`](design/architecture/itinerry_form_logic_tree.mermaid) | branching logic tree |

### เอกสาร LINE ทางการ
- [Get user IDs](https://developers.line.biz/en/docs/messaging-api/getting-user-ids/) — provider scoping
- [Link a bot to LINE Login](https://developers.line.biz/en/docs/line-login/link-a-bot/) — bot_prompt + friendship
- [LINE Login API reference](https://developers.line.biz/en/reference/line-login/) — `/v2/profile`, id_token, verify
- [Messaging API reference](https://developers.line.biz/en/reference/messaging-api/) — push message
