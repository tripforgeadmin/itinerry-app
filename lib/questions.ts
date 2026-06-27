export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "radio"
  | "dropdown"
  | "multiCheckbox"
  | "date"
  | "consent";

export interface Option {
  value: string;
  label: string;
  labelEn?: string;
  emoji?: string;
  nextId?: string;
}

export interface Question {
  id: string;
  type: FieldType;
  question: string;
  questionEn?: string;
  placeholder?: string;
  placeholderEn?: string;
  options?: Option[];
  required?: boolean;
  defaultNextId?: string;
  allowOtherText?: boolean;
  otherPlaceholder?: string;
  otherPlaceholderEn?: string;
  section: string;
  sectionTitle: string;
  sectionTitleEn?: string;
  sectionEmoji: string;
}

export const QUESTIONS: Question[] = [
  // ── S0: Consent ──────────────────────────────────────────────
  {
    id: "q1",
    type: "consent",
    question:
      "itinerry เก็บข้อมูลส่วนบุคคลของคุณ (ชื่อ ช่องทางติดต่อ ข้อมูลการเดินทาง อาชีพ และข้อมูลทางการเงินโดยสังเขป) เพื่อประเมินและให้บริการยื่นขอวีซ่า ข้าพเจ้าได้อ่านและยินยอมให้ itinerry เก็บและใช้ข้อมูลตามวัตถุประสงค์ข้างต้น",
    questionEn:
      "itinerry collects your personal data (name, contact, travel details, occupation, basic financial info) to assess and provide visa services. I have read and consent to itinerry collecting and using my data for the purposes above.",
    required: true,
    defaultNextId: "q3",
    section: "S0",
    sectionTitle: "ข้อตกลงและความยินยอม",
    sectionTitleEn: "Consent",
    sectionEmoji: "📋",
  },
  {
    id: "q2",
    type: "consent",
    question:
      "ข้าพเจ้าขอรับรองว่าข้อมูลทั้งหมดในแบบฟอร์มนี้เป็นความจริงและถูกต้องทุกประการ และเข้าใจว่าข้อมูลอันเป็นเท็จหรือไม่ครบถ้วนอาจส่งผลต่อผลการพิจารณาวีซ่าและการให้บริการ",
    questionEn:
      "I certify that all information in this form is true and accurate, and understand that false or incomplete information may affect the visa outcome and the services provided.",
    required: true,
    section: "S0",
    sectionTitle: "ข้อตกลงและความยินยอม",
    sectionTitleEn: "Consent",
    sectionEmoji: "📋",
  },

  // ── S1: Personal Info ─────────────────────────────────────────
  {
    id: "q3",
    type: "text",
    question: "ชื่อ-นามสกุล",
    questionEn: "Full Name",
    placeholder: "กรอกชื่อ-นามสกุล",
    placeholderEn: "Enter your full name",
    required: true,
    defaultNextId: "q4",
    section: "S1",
    sectionTitle: "ข้อมูลส่วนตัว",
    sectionTitleEn: "Personal Information",
    sectionEmoji: "👤",
  },
  {
    id: "q4",
    type: "radio",
    question: "สัญชาติ",
    questionEn: "Nationality",
    required: true,
    allowOtherText: true,
    otherPlaceholder: "ระบุสัญชาติ",
    otherPlaceholderEn: "Enter your nationality",
    defaultNextId: "q5",
    section: "S1",
    sectionTitle: "ข้อมูลส่วนตัว",
    sectionTitleEn: "Personal Information",
    sectionEmoji: "👤",
    options: [
      { value: "thai", label: "ไทย", labelEn: "Thai", emoji: "🇹🇭" },
      { value: "other", label: "อื่นๆ", labelEn: "Other", emoji: "🌍" },
    ],
  },
  {
    id: "q5",
    type: "tel",
    question: "เบอร์โทรศัพท์",
    questionEn: "Phone Number",
    placeholder: "0812345678",
    placeholderEn: "0812345678",
    required: true,
    defaultNextId: "q6",
    section: "S1",
    sectionTitle: "ข้อมูลส่วนตัว",
    sectionTitleEn: "Personal Information",
    sectionEmoji: "👤",
  },
  {
    id: "q6",
    type: "email",
    question: "อีเมล (สำหรับรับเอกสารตอนให้บริการ)",
    questionEn: "Email (for receiving documents)",
    placeholder: "example@email.com",
    placeholderEn: "example@email.com",
    required: true,
    defaultNextId: "q7",
    section: "S1",
    sectionTitle: "ข้อมูลส่วนตัว",
    sectionTitleEn: "Personal Information",
    sectionEmoji: "👤",
  },
  {
    id: "q7",
    type: "radio",
    question: "รู้จัก itinerry จากช่องทางไหน?",
    questionEn: "How did you find us?",
    required: true,
    allowOtherText: true,
    otherPlaceholder: "ระบุช่องทาง",
    otherPlaceholderEn: "Enter source",
    defaultNextId: "q8",
    section: "S1",
    sectionTitle: "ข้อมูลส่วนตัว",
    sectionTitleEn: "Personal Information",
    sectionEmoji: "👤",
    options: [
      { value: "facebook", label: "Facebook", emoji: "📘" },
      { value: "instagram", label: "Instagram", emoji: "📸" },
      { value: "tiktok", label: "TikTok", emoji: "🎵" },
      { value: "google", label: "Google", emoji: "🔍" },
      { value: "referral", label: "เพื่อนแนะนำ", labelEn: "Referral", emoji: "👥" },
      { value: "other", label: "อื่นๆ", labelEn: "Other", emoji: "✨" },
    ],
  },

  // ── S2: Destination + Visa Type ───────────────────────────────
  {
    id: "q8",
    type: "dropdown",
    question: "ประเทศที่ต้องการยื่นวีซ่า",
    questionEn: "Destination Country",
    required: true,
    defaultNextId: "q9",
    section: "S2",
    sectionTitle: "ปลายทาง + ประเภทวีซ่า",
    sectionTitleEn: "Destination + Visa Type",
    sectionEmoji: "✈️",
    options: [
      { value: "schengen", label: "Schengen / ยุโรป", labelEn: "Schengen / Europe", emoji: "🇪🇺" },
      { value: "uk", label: "United Kingdom", emoji: "🇬🇧" },
      { value: "usa", label: "United States", emoji: "🇺🇸" },
      { value: "canada", label: "Canada", emoji: "🇨🇦" },
      { value: "australia", label: "Australia", emoji: "🇦🇺" },
      { value: "nz", label: "New Zealand", emoji: "🇳🇿" },
      { value: "japan", label: "Japan", emoji: "🇯🇵" },
      { value: "korea", label: "South Korea", emoji: "🇰🇷" },
      { value: "china", label: "China", emoji: "🇨🇳" },
      { value: "taiwan", label: "Taiwan", emoji: "🇹🇼" },
      { value: "india", label: "India", emoji: "🇮🇳" },
      { value: "dubai", label: "Dubai / UAE", emoji: "🇦🇪" },
      { value: "saudi", label: "Saudi Arabia", emoji: "🇸🇦" },
      { value: "qatar", label: "Qatar", emoji: "🇶🇦" },
      { value: "other", label: "อื่นๆ / Others", labelEn: "Others", emoji: "🌍" },
    ],
  },
  {
    id: "q9",
    type: "radio",
    question: "ประเภทวีซ่าที่ต้องการ",
    questionEn: "Visa Type",
    required: true,
    section: "S2",
    sectionTitle: "ปลายทาง + ประเภทวีซ่า",
    sectionTitleEn: "Destination + Visa Type",
    sectionEmoji: "✈️",
    options: [
      { value: "tourist", label: "วีซ่าท่องเที่ยว", labelEn: "Tourist", emoji: "🏖️", nextId: "q10" },
      { value: "visitor", label: "วีซ่าเยี่ยมเยียน", labelEn: "Visitor", emoji: "👨‍👩‍👧", nextId: "q13" },
      { value: "business", label: "วีซ่าธุรกิจ", labelEn: "Business", emoji: "🤝", nextId: "q17" },
      { value: "student", label: "วีซ่านักเรียน", labelEn: "Student", emoji: "🎓", nextId: "q21" },
    ],
  },

  // ── S2A: Tourist ──────────────────────────────────────────────
  {
    id: "q10",
    type: "date",
    question: "วันที่วางแผนเดินทาง (วันแรกที่ถึงปลายทาง)",
    questionEn: "Planned Arrival Date",
    required: true,
    defaultNextId: "q11",
    section: "S2A",
    sectionTitle: "วีซ่าท่องเที่ยว",
    sectionTitleEn: "Tourist Visa",
    sectionEmoji: "🏖️",
  },
  {
    id: "q11",
    type: "date",
    question: "วันที่วางแผนกลับ (วันที่ออกจากประเทศปลายทาง)",
    questionEn: "Planned Return Date",
    required: true,
    defaultNextId: "q12",
    section: "S2A",
    sectionTitle: "วีซ่าท่องเที่ยว",
    sectionTitleEn: "Tourist Visa",
    sectionEmoji: "🏖️",
  },
  {
    id: "q12",
    type: "multiCheckbox",
    question: "เคยได้รับวีซ่าประเทศเหล่านี้ภายใน 5 ปีที่ผ่านมาไหม? (เลือกได้มากกว่า 1)",
    questionEn: "Have you received any of these visas in the last 5 years? (select all that apply)",
    required: true,
    defaultNextId: "q24",
    section: "S2A",
    sectionTitle: "วีซ่าท่องเที่ยว",
    sectionTitleEn: "Tourist Visa",
    sectionEmoji: "🏖️",
    options: [
      { value: "never", label: "ไม่เคย", labelEn: "Never" },
      { value: "uk", label: "UK", emoji: "🇬🇧" },
      { value: "schengen", label: "Schengen", emoji: "🇪🇺" },
      { value: "usa", label: "USA", emoji: "🇺🇸" },
      { value: "canada", label: "Canada", emoji: "🇨🇦" },
      { value: "australia", label: "Australia", emoji: "🇦🇺" },
      { value: "nz", label: "New Zealand", emoji: "🇳🇿" },
      { value: "japan", label: "Japan", emoji: "🇯🇵" },
      { value: "korea", label: "S. Korea", emoji: "🇰🇷" },
      { value: "china", label: "China", emoji: "🇨🇳" },
      { value: "dubai", label: "Dubai / UAE", emoji: "🇦🇪" },
    ],
  },

  // ── S2B: Visitor ──────────────────────────────────────────────
  {
    id: "q13",
    type: "date",
    question: "วันที่วางแผนเดินทาง (วันแรกที่ถึงปลายทาง)",
    questionEn: "Planned Arrival Date",
    required: true,
    defaultNextId: "q14",
    section: "S2B",
    sectionTitle: "วีซ่าเยี่ยมเยียน",
    sectionTitleEn: "Visitor Visa",
    sectionEmoji: "👨‍👩‍👧",
  },
  {
    id: "q14",
    type: "radio",
    question: "คนที่คุณจะไปเยี่ยมมีสถานะอะไรในประเทศนั้น?",
    questionEn: "What is the immigration status of the person you are visiting?",
    required: true,
    defaultNextId: "q15",
    section: "S2B",
    sectionTitle: "วีซ่าเยี่ยมเยียน",
    sectionTitleEn: "Visitor Visa",
    sectionEmoji: "👨‍👩‍👧",
    options: [
      { value: "citizen_pr", label: "Citizen / PR", emoji: "🏠" },
      { value: "work_visa", label: "Work Visa", emoji: "💼" },
      { value: "student_visa", label: "Student Visa", emoji: "🎓" },
      { value: "not_sure", label: "ไม่แน่ใจ", labelEn: "Not sure", emoji: "❓" },
    ],
  },
  {
    id: "q15",
    type: "radio",
    question: "ผู้เชิญมีความสัมพันธ์รูปแบบใดกับคุณ?",
    questionEn: "What is your relationship with the person you are visiting?",
    required: true,
    defaultNextId: "q16",
    section: "S2B",
    sectionTitle: "วีซ่าเยี่ยมเยียน",
    sectionTitleEn: "Visitor Visa",
    sectionEmoji: "👨‍👩‍👧",
    options: [
      { value: "family", label: "ครอบครัว", labelEn: "Family", emoji: "👨‍👩‍👧" },
      { value: "relative", label: "ญาติ", labelEn: "Relative", emoji: "👪" },
      { value: "married", label: "คู่สมรส (จดทะเบียน)", labelEn: "Spouse (married)", emoji: "💍" },
      { value: "partner", label: "แฟน", labelEn: "Partner", emoji: "❤️" },
      { value: "friend", label: "เพื่อน", labelEn: "Friend", emoji: "👥" },
    ],
  },
  {
    id: "q16",
    type: "multiCheckbox",
    question: "เอกสารที่ผู้เชิญสามารถส่งให้คุณได้ (เลือกได้มากกว่า 1)",
    questionEn: "Documents the inviter can provide (select all that apply)",
    required: true,
    defaultNextId: "q24",
    section: "S2B",
    sectionTitle: "วีซ่าเยี่ยมเยียน",
    sectionTitleEn: "Visitor Visa",
    sectionEmoji: "👨‍👩‍👧",
    options: [
      { value: "invitation_letter", label: "จดหมายเชิญ", labelEn: "Invitation Letter", emoji: "📝" },
      { value: "house_cert", label: "หลักฐานที่พัก", labelEn: "House Certificate", emoji: "🏠" },
      { value: "job_cert", label: "จดหมายรับรองงาน", labelEn: "Job Certificate", emoji: "💼" },
      { value: "bank_stmt", label: "รายการเดินบัญชี 6 เดือน", labelEn: "Bank Statement 6m", emoji: "💳" },
      { value: "none", label: "ไม่มีเลย", labelEn: "None", emoji: "➖" },
    ],
  },

  // ── S2C: Business ─────────────────────────────────────────────
  {
    id: "q17",
    type: "date",
    question: "วันที่วางแผนเดินทาง (วันแรกที่ถึงปลายทาง)",
    questionEn: "Planned Arrival Date",
    required: true,
    defaultNextId: "q18",
    section: "S2C",
    sectionTitle: "วีซ่าธุรกิจ",
    sectionTitleEn: "Business Visa",
    sectionEmoji: "🤝",
  },
  {
    id: "q18",
    type: "date",
    question: "วันที่วางแผนกลับ (วันที่ออกจากประเทศปลายทาง)",
    questionEn: "Planned Return Date",
    required: true,
    defaultNextId: "q19",
    section: "S2C",
    sectionTitle: "วีซ่าธุรกิจ",
    sectionTitleEn: "Business Visa",
    sectionEmoji: "🤝",
  },
  {
    id: "q19",
    type: "radio",
    question: "มีหนังสือเชิญ (Invitation Letter) จากบริษัทในประเทศปลายทางไหม?",
    questionEn: "Do you have an Invitation Letter from a company in the destination country?",
    required: true,
    defaultNextId: "q20",
    section: "S2C",
    sectionTitle: "วีซ่าธุรกิจ",
    sectionTitleEn: "Business Visa",
    sectionEmoji: "🤝",
    options: [
      { value: "yes", label: "มีแล้ว", labelEn: "Yes", emoji: "✅" },
      { value: "requesting", label: "กำลังจะขอ", labelEn: "Requesting soon", emoji: "⏳" },
      { value: "not_required", label: "ไม่ต้องการ", labelEn: "Not required", emoji: "➖" },
    ],
  },
  {
    id: "q20",
    type: "multiCheckbox",
    question: "เคยได้รับวีซ่าประเทศเหล่านี้ภายใน 5 ปีที่ผ่านมาไหม? (เลือกได้มากกว่า 1)",
    questionEn: "Have you received any of these visas in the last 5 years? (select all that apply)",
    required: true,
    defaultNextId: "q24",
    section: "S2C",
    sectionTitle: "วีซ่าธุรกิจ",
    sectionTitleEn: "Business Visa",
    sectionEmoji: "🤝",
    options: [
      { value: "never", label: "ไม่เคย", labelEn: "Never" },
      { value: "uk", label: "UK", emoji: "🇬🇧" },
      { value: "schengen", label: "Schengen", emoji: "🇪🇺" },
      { value: "usa", label: "USA", emoji: "🇺🇸" },
      { value: "canada", label: "Canada", emoji: "🇨🇦" },
      { value: "australia", label: "Australia", emoji: "🇦🇺" },
      { value: "nz", label: "New Zealand", emoji: "🇳🇿" },
      { value: "japan", label: "Japan", emoji: "🇯🇵" },
      { value: "korea", label: "S. Korea", emoji: "🇰🇷" },
      { value: "china", label: "China", emoji: "🇨🇳" },
      { value: "dubai", label: "Dubai / UAE", emoji: "🇦🇪" },
    ],
  },

  // ── S2D: Student ──────────────────────────────────────────────
  {
    id: "q21",
    type: "date",
    question: "วันที่วางแผนเริ่มเรียน (วันแรกที่เริ่มเรียน)",
    questionEn: "Planned Study Start Date",
    required: true,
    defaultNextId: "q22",
    section: "S2D",
    sectionTitle: "วีซ่านักเรียน",
    sectionTitleEn: "Student Visa",
    sectionEmoji: "🎓",
  },
  {
    id: "q22",
    type: "radio",
    question: "ได้รับ Acceptance Letter จากสถาบันแล้วไหม?",
    questionEn: "Have you received an Acceptance Letter from the institution?",
    required: true,
    defaultNextId: "q23",
    section: "S2D",
    sectionTitle: "วีซ่านักเรียน",
    sectionTitleEn: "Student Visa",
    sectionEmoji: "🎓",
    options: [
      { value: "received", label: "ได้รับแล้ว", labelEn: "Yes, received", emoji: "✅" },
      { value: "in_progress", label: "อยู่ระหว่างสมัคร", labelEn: "Application in progress", emoji: "⏳" },
      { value: "not_applied", label: "ยังไม่ได้สมัคร", labelEn: "Not yet applied", emoji: "📝" },
    ],
  },
  {
    id: "q23",
    type: "radio",
    question: "ใครเป็นผู้รับผิดชอบค่าใช้จ่ายในการเรียน?",
    questionEn: "Who is responsible for study expenses?",
    required: true,
    defaultNextId: "q24",
    section: "S2D",
    sectionTitle: "วีซ่านักเรียน",
    sectionTitleEn: "Student Visa",
    sectionEmoji: "🎓",
    options: [
      { value: "self", label: "ตัวเอง", labelEn: "Self", emoji: "👤" },
      { value: "parents", label: "พ่อแม่", labelEn: "Parents", emoji: "👨‍👩‍👧" },
      { value: "scholarship", label: "ทุนการศึกษา", labelEn: "Scholarship", emoji: "🏆" },
      { value: "other", label: "อื่นๆ", labelEn: "Other", emoji: "✨" },
    ],
  },

  // ── S3: Occupation ────────────────────────────────────────────
  {
    id: "q24",
    type: "radio",
    question: "อาชีพปัจจุบันของคุณคืออะไร?",
    questionEn: "What is your current occupation?",
    required: true,
    section: "S3",
    sectionTitle: "อาชีพปัจจุบัน",
    sectionTitleEn: "Current Occupation",
    sectionEmoji: "💼",
    options: [
      { value: "employee", label: "พนักงานประจำ", labelEn: "Employee", emoji: "🏢", nextId: "q25" },
      { value: "government", label: "ข้าราชการ", labelEn: "Government Officer", emoji: "🏛️", nextId: "q25" },
      { value: "freelance", label: "Freelance / อิสระ", labelEn: "Freelance", emoji: "💻", nextId: "q26" },
      { value: "business_owner", label: "เจ้าของธุรกิจ", labelEn: "Business Owner", emoji: "🏪", nextId: "q28" },
      { value: "retired", label: "เกษียณอายุ", labelEn: "Retired", emoji: "🌿", nextId: "q29" },
      { value: "homemaker", label: "แม่บ้าน", labelEn: "Homemaker", emoji: "🏠", nextId: "q29" },
      { value: "student_occ", label: "นักเรียน/นักศึกษา", labelEn: "Student", emoji: "🎓", nextId: "q29" },
    ],
  },

  // ── S4A: Employee ─────────────────────────────────────────────
  {
    id: "q25",
    type: "radio",
    question: "มีหนังสือรับรองงานที่ระบุ ตำแหน่ง + เงินเดือน + วันลาไหม?",
    questionEn: "Do you have an Employment Letter specifying position, salary, and approved leave?",
    required: true,
    defaultNextId: "q30",
    section: "S4A",
    sectionTitle: "พนักงานประจำ / ข้าราชการ",
    sectionTitleEn: "Employee / Government Officer",
    sectionEmoji: "🏢",
    options: [
      { value: "complete", label: "มีครบ", labelEn: "Yes, complete", emoji: "✅" },
      { value: "partial", label: "มีแต่ไม่ครบ", labelEn: "Partial", emoji: "⚠️" },
      { value: "none", label: "ยังไม่มี", labelEn: "Not yet", emoji: "❌" },
    ],
  },

  // ── S4B: Freelance ────────────────────────────────────────────
  {
    id: "q26",
    type: "radio",
    question: "มีเอกสารพิสูจน์รายได้ไหม? (สัญญา / Invoice / Bank Transfer)",
    questionEn: "Do you have income proof? (Contract / Invoice / Bank Transfer)",
    required: true,
    defaultNextId: "q27",
    section: "S4B",
    sectionTitle: "Freelance / อาชีพอิสระ",
    sectionTitleEn: "Freelance",
    sectionEmoji: "💻",
    options: [
      { value: "all_three", label: "มีครบทั้งสามอย่าง", labelEn: "Have all three", emoji: "✅" },
      { value: "partial", label: "มีบางส่วน", labelEn: "Partial", emoji: "⚠️" },
      { value: "none", label: "ไม่มีเลย", labelEn: "None", emoji: "❌" },
    ],
  },
  {
    id: "q27",
    type: "radio",
    question: "มีเอกสารชำระภาษีย้อนหลัง 3 ปีไหม?",
    questionEn: "Do you have tax documents for the last 3 years?",
    required: true,
    defaultNextId: "q30",
    section: "S4B",
    sectionTitle: "Freelance / อาชีพอิสระ",
    sectionTitleEn: "Freelance",
    sectionEmoji: "💻",
    options: [
      { value: "all_3y", label: "มีครบ 3 ปี", labelEn: "Have all 3 years", emoji: "✅" },
      { value: "partial", label: "มีบางส่วน", labelEn: "Partial", emoji: "⚠️" },
      { value: "none", label: "ไม่มีเลย", labelEn: "None", emoji: "❌" },
    ],
  },

  // ── S4C: Business Owner ───────────────────────────────────────
  {
    id: "q28",
    type: "radio",
    question: "มีหนังสือรับรองบริษัท (DBD) หรือเอกสารจดทะเบียนธุรกิจไหม?",
    questionEn: "Do you have a Company Registration Certificate (DBD or equivalent)?",
    required: true,
    defaultNextId: "q30",
    section: "S4C",
    sectionTitle: "เจ้าของธุรกิจ",
    sectionTitleEn: "Business Owner",
    sectionEmoji: "🏪",
    options: [
      { value: "yes", label: "มีแล้ว", labelEn: "Yes", emoji: "✅" },
      { value: "no", label: "ยังไม่มี", labelEn: "Not yet", emoji: "❌" },
    ],
  },

  // ── S4D: Retired / Homemaker / Student Occ ───────────────────
  {
    id: "q29",
    type: "radio",
    question: "ใครเป็นผู้รับผิดชอบค่าใช้จ่ายในการเดินทาง?",
    questionEn: "Who is responsible for your travel expenses?",
    required: true,
    defaultNextId: "q30",
    section: "S4D",
    sectionTitle: "ผู้รับผิดชอบค่าใช้จ่าย",
    sectionTitleEn: "Travel Expenses",
    sectionEmoji: "💰",
    options: [
      { value: "parents", label: "พ่อแม่", labelEn: "Parents", emoji: "👨‍👩‍👧" },
      { value: "spouse", label: "คู่สมรส", labelEn: "Spouse", emoji: "💍" },
      { value: "self_savings", label: "ตัวเอง (มีเงินออม)", labelEn: "Self (savings)", emoji: "💰" },
      { value: "employer", label: "บริษัท", labelEn: "Employer", emoji: "🏢" },
      { value: "other", label: "อื่นๆ", labelEn: "Other", emoji: "✨" },
    ],
  },

  // ── S5: Core Qualification ────────────────────────────────────
  {
    id: "q30",
    type: "radio",
    question: "เคยถูกปฏิเสธวีซ่าจากประเทศใดไหม?",
    questionEn: "Have you ever been refused a visa from any country?",
    required: true,
    section: "S5",
    sectionTitle: "คัดกรองหลัก",
    sectionTitleEn: "Core Qualification",
    sectionEmoji: "🔍",
    options: [
      { value: "never", label: "ไม่เคย", labelEn: "Never", emoji: "✅", nextId: "q32" },
      { value: "yes", label: "เคย", labelEn: "Yes", emoji: "⚠️", nextId: "q31" },
    ],
  },
  {
    id: "q31",
    type: "text",
    question: "ระบุประเทศและปีที่ถูกปฏิเสธวีซ่า",
    questionEn: "Specify country and year of visa refusal",
    placeholder: "เช่น UK 2022, Japan 2023",
    placeholderEn: "e.g. UK 2022, Japan 2023",
    required: true,
    defaultNextId: "q32",
    section: "S5",
    sectionTitle: "คัดกรองหลัก",
    sectionTitleEn: "Core Qualification",
    sectionEmoji: "🔍",
  },
  {
    id: "q32",
    type: "radio",
    question: "เคยอยู่ในประเทศใดเกินกำหนดวีซ่า (Overstay) ไหม?",
    questionEn: "Have you ever overstayed a visa in any country?",
    required: true,
    section: "S5",
    sectionTitle: "คัดกรองหลัก",
    sectionTitleEn: "Core Qualification",
    sectionEmoji: "🔍",
    options: [
      { value: "never", label: "ไม่เคย", labelEn: "Never", emoji: "✅", nextId: "q34" },
      { value: "yes", label: "เคย", labelEn: "Yes", emoji: "⚠️", nextId: "q33" },
    ],
  },
  {
    id: "q33",
    type: "text",
    question: "ระบุประเทศ ระยะเวลา และปีที่เกิด Overstay",
    questionEn: "Specify country, duration, and year of overstay",
    placeholder: "เช่น UK 2 สัปดาห์ 2021",
    placeholderEn: "e.g. UK 2 weeks 2021",
    required: true,
    defaultNextId: "q34",
    section: "S5",
    sectionTitle: "คัดกรองหลัก",
    sectionTitleEn: "Core Qualification",
    sectionEmoji: "🔍",
  },
  {
    id: "q34",
    type: "radio",
    question: "ยอดเงินในบัญชีออมทรัพย์ปัจจุบันประมาณเท่าไหร่? (ของตัวเองหรือผู้รับผิดชอบค่าใช้จ่าย)",
    questionEn: "Approximate savings account balance? (Self or sponsor)",
    required: true,
    defaultNextId: "q35",
    section: "S5",
    sectionTitle: "คัดกรองหลัก",
    sectionTitleEn: "Core Qualification",
    sectionEmoji: "🔍",
    options: [
      { value: "under50k", label: "น้อยกว่า 50,000 บาท", labelEn: "< 50K THB", emoji: "💸" },
      { value: "50k_150k", label: "50,000–150,000 บาท", labelEn: "50–150K THB", emoji: "💰" },
      { value: "150k_300k", label: "150,000–300,000 บาท", labelEn: "150–300K THB", emoji: "💰" },
      { value: "over300k", label: "มากกว่า 300,000 บาท", labelEn: "> 300K THB", emoji: "💎" },
    ],
  },
  {
    id: "q35",
    type: "multiCheckbox",
    question: "ความผูกพันกับประเทศไทย (เลือกได้มากกว่า 1)",
    questionEn: "Ties to Thailand (select all that apply)",
    required: true,
    defaultNextId: "q36",
    section: "S5",
    sectionTitle: "คัดกรองหลัก",
    sectionTitleEn: "Core Qualification",
    sectionEmoji: "🔍",
    options: [
      { value: "job", label: "งานประจำหรือธุรกิจในไทย", labelEn: "Job or business in Thailand", emoji: "💼" },
      { value: "property", label: "บ้าน/คอนโด/ที่ดินในไทย", labelEn: "Own property in Thailand", emoji: "🏠" },
      { value: "spouse_children", label: "คู่สมรสหรือบุตรอยู่ในไทย", labelEn: "Spouse or children in Thailand", emoji: "👨‍👩‍👧" },
      { value: "dependents", label: "พ่อแม่หรือผู้ที่ต้องดูแลในไทย", labelEn: "Dependents in Thailand", emoji: "👴" },
      { value: "investments", label: "เงินลงทุนหรือทรัพย์สินอื่น", labelEn: "Investments or other assets", emoji: "📈" },
      { value: "none", label: "ไม่มีข้อใดข้างต้น", labelEn: "None of the above", emoji: "➖" },
    ],
  },

  // ── S6: Contact Preference ────────────────────────────────────
  {
    id: "q36",
    type: "radio",
    question: "ต้องการให้เราติดต่อกลับทางไหน?",
    questionEn: "How would you like us to contact you?",
    required: true,
    section: "S6",
    sectionTitle: "นัดรับการติดต่อ",
    sectionTitleEn: "Schedule Callback",
    sectionEmoji: "📞",
    options: [
      { value: "line", label: "ผ่าน LINE OA @itinerry", labelEn: "Via LINE OA @itinerry", emoji: "💬", nextId: "q2" },
      { value: "call", label: "ให้โทรกลับ", labelEn: "Call me back", emoji: "📱", nextId: "q37" },
    ],
  },

  // ── S7: Callback Time ─────────────────────────────────────────
  {
    id: "q37",
    type: "radio",
    question: "ช่วงเวลาที่ต้องการให้ติดต่อกลับ",
    questionEn: "Preferred callback time",
    required: true,
    section: "S7",
    sectionTitle: "ช่วงเวลาโทรกลับ",
    sectionTitleEn: "Callback Time",
    sectionEmoji: "⏰",
    options: [
      { value: "morning", label: "เช้า 9:00–12:00", labelEn: "Morning 9:00–12:00", emoji: "🌅" },
      { value: "afternoon", label: "บ่าย 12:00–15:00", labelEn: "Afternoon 12:00–15:00", emoji: "☀️" },
      { value: "evening", label: "เย็น 15:00–18:00", labelEn: "Evening 15:00–18:00", emoji: "🌆" },
    ],
    defaultNextId: "q2",
  },
];

export const QUESTIONS_MAP: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q])
);

export const FIRST_QUESTION_ID = "q1";
