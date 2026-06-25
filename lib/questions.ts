export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "consent";

export interface Option {
  value: string;
  label: string;
  labelEn?: string;
  emoji?: string;
}

export interface Question {
  id: string;
  type: FieldType;
  question: string;
  questionEn?: string;
  placeholder?: string;
  options?: Option[];
  required?: boolean;
  /** If true, shows a text input when the user selects the "other" option */
  allowOtherText?: boolean;
  /** If set, this question only shows when answers[conditionKey] matches conditionValue */
  conditionKey?: string;
  conditionValue?: string | string[];
}

export interface Step {
  id: string;
  title: string;
  titleEn?: string;
  emoji: string;
  questions: Question[];
}

// ─── Step 1: Personal Info ──────────────────────────────────────────────────
const personalInfoStep: Step = {
  id: "personal",
  title: "ข้อมูลส่วนตัว",
  titleEn: "Personal Information",
  emoji: "👤",
  questions: [
    {
      id: "fullName",
      type: "text",
      question: "ชื่อ-นามสกุล",
      questionEn: "Full Name",
      placeholder: "กรอกชื่อ-นามสกุล",
      required: true,
    },
    {
      id: "nationality",
      type: "dropdown",
      question: "สัญชาติ",
      questionEn: "Nationality",
      required: true,
      options: [
        { value: "thai", label: "ไทย", labelEn: "Thai" },
        { value: "other", label: "อื่นๆ", labelEn: "Other" },
      ],
    },
    {
      id: "phone",
      type: "tel",
      question: "เบอร์โทรศัพท์",
      questionEn: "Phone Number",
      placeholder: "0812345678",
      required: true,
    },
    {
      id: "email",
      type: "email",
      question: "อีเมล",
      questionEn: "Email Address",
      placeholder: "example@email.com",
      required: true,
    },
    {
      id: "source",
      type: "radio",
      question: "รู้จัก itinerry จากช่องทางไหน?",
      questionEn: "How did you find us?",
      required: true,
      options: [
        { value: "facebook", label: "Facebook", labelEn: "Facebook", emoji: "📘" },
        { value: "instagram", label: "Instagram", labelEn: "Instagram", emoji: "📸" },
        { value: "tiktok", label: "TikTok", labelEn: "TikTok", emoji: "🎵" },
        { value: "google", label: "Google", labelEn: "Google", emoji: "🔍" },
        { value: "referral", label: "เพื่อนแนะนำ", labelEn: "Friend referral", emoji: "👥" },
        { value: "other", label: "อื่นๆ", labelEn: "Other", emoji: "✨" },
      ],
    },
  ],
};

// ─── Step 2: Occupation + Visa Type (branching point) ──────────────────────
const branchingStep: Step = {
  id: "branching",
  title: "ข้อมูลการทำงานและวีซ่า",
  titleEn: "Work & Visa",
  emoji: "✈️",
  questions: [
    {
      id: "occupation",
      type: "radio",
      question: "อาชีพปัจจุบันของคุณคืออะไร?",
      questionEn: "What is your current occupation?",
      required: true,
      options: [
        { value: "employee", label: "พนักงานบริษัท / ลูกจ้าง", labelEn: "Employee", emoji: "💼" },
        { value: "selfEmployed", label: "ธุรกิจส่วนตัว / เจ้าของกิจการ", labelEn: "Self-employed / Business owner", emoji: "🏪" },
        { value: "freelance", label: "ฟรีแลนซ์", labelEn: "Freelance", emoji: "💻" },
        { value: "student", label: "นักเรียน / นักศึกษา", labelEn: "Student", emoji: "🎓" },
        { value: "retired", label: "เกษียณ / ไม่ได้ทำงาน", labelEn: "Retired / Not working", emoji: "🌿" },
        { value: "other", label: "อื่นๆ", labelEn: "Other", emoji: "✨" },
      ],
    },
    {
      id: "visaType",
      type: "radio",
      question: "ประเภทวีซ่าที่ต้องการยื่น",
      questionEn: "Visa Type",
      required: true,
      options: [
        { value: "tourist", label: "ท่องเที่ยว", labelEn: "Tourist", emoji: "✈️" },
        { value: "student", label: "นักเรียน", labelEn: "Student", emoji: "🎓" },
        { value: "work", label: "ทำงาน", labelEn: "Work", emoji: "💼" },
        { value: "business", label: "ธุรกิจ", labelEn: "Business", emoji: "🤝" },
        { value: "family", label: "ติดตามครอบครัว", labelEn: "Family", emoji: "👨‍👩‍👧" },
        { value: "other", label: "อื่นๆ", labelEn: "Other", emoji: "✨" },
      ],
    },
    {
      id: "destination",
      type: "radio",
      question: "ประเทศปลายทาง",
      questionEn: "Destination Country",
      required: true,
      allowOtherText: true,
      options: [
        { value: "uk", label: "สหราชอาณาจักร 🇬🇧", labelEn: "United Kingdom 🇬🇧" },
        { value: "schengen", label: "เชงเก้น / ยุโรป 🇪🇺", labelEn: "Schengen / Europe 🇪🇺" },
        { value: "usa", label: "สหรัฐอเมริกา 🇺🇸", labelEn: "United States 🇺🇸" },
        { value: "canada", label: "แคนาดา 🇨🇦", labelEn: "Canada 🇨🇦" },
        { value: "australia", label: "ออสเตรเลีย 🇦🇺", labelEn: "Australia 🇦🇺" },
        { value: "japan", label: "ญี่ปุ่น 🇯🇵", labelEn: "Japan 🇯🇵" },
        { value: "other", label: "อื่นๆ", labelEn: "Other" },
      ],
    },
  ],
};

// ─── Step 3: Financial Info (all visa types) ────────────────────────────────
const financialStep: Step = {
  id: "financial",
  title: "ข้อมูลทางการเงิน",
  titleEn: "Financial Information",
  emoji: "💰",
  questions: [
    {
      id: "monthlyIncome",
      type: "radio",
      question: "รายได้ต่อเดือนโดยประมาณ (บาท)",
      questionEn: "Approximate monthly income (THB)",
      required: true,
      options: [
        { value: "under15k", label: "ต่ำกว่า 15,000", labelEn: "Under 15,000" },
        { value: "15k-30k", label: "15,000 – 30,000", labelEn: "15,000 – 30,000" },
        { value: "30k-60k", label: "30,000 – 60,000", labelEn: "30,000 – 60,000" },
        { value: "60k-100k", label: "60,000 – 100,000", labelEn: "60,000 – 100,000" },
        { value: "over100k", label: "มากกว่า 100,000", labelEn: "Over 100,000" },
      ],
    },
    {
      id: "bankBalance",
      type: "radio",
      question: "ยอดเงินในบัญชีธนาคาร (ประมาณ)",
      questionEn: "Approximate bank account balance (THB)",
      required: true,
      options: [
        { value: "under50k", label: "ต่ำกว่า 50,000", labelEn: "Under 50,000" },
        { value: "50k-150k", label: "50,000 – 150,000", labelEn: "50,000 – 150,000" },
        { value: "150k-500k", label: "150,000 – 500,000", labelEn: "150,000 – 500,000" },
        { value: "over500k", label: "มากกว่า 500,000", labelEn: "Over 500,000" },
      ],
    },
    {
      id: "hasProperty",
      type: "radio",
      question: "มีทรัพย์สิน เช่น บ้าน รถ หรือที่ดิน ในไทยหรือไม่?",
      questionEn: "Do you own property (house, car, land) in Thailand?",
      required: true,
      options: [
        { value: "yes", label: "มี", labelEn: "Yes", emoji: "✅" },
        { value: "no", label: "ไม่มี", labelEn: "No", emoji: "❌" },
      ],
    },
  ],
};

// ─── Step 4: Travel History ─────────────────────────────────────────────────
const travelHistoryStep: Step = {
  id: "travel",
  title: "ประวัติการเดินทาง",
  titleEn: "Travel History",
  emoji: "🗺️",
  questions: [
    {
      id: "prevVisaRefusal",
      type: "radio",
      question: "เคยถูกปฏิเสธวีซ่ามาก่อนหรือไม่?",
      questionEn: "Have you ever been refused a visa before?",
      required: true,
      options: [
        { value: "no", label: "ไม่เคย", labelEn: "Never", emoji: "✅" },
        { value: "yes", label: "เคย", labelEn: "Yes, I have", emoji: "⚠️" },
      ],
    },
    {
      id: "prevTravel",
      type: "radio",
      question: "เคยเดินทางไปต่างประเทศมาก่อนหรือไม่?",
      questionEn: "Have you traveled abroad before?",
      required: true,
      options: [
        { value: "never", label: "ไม่เคย", labelEn: "Never" },
        { value: "once_twice", label: "1-2 ครั้ง", labelEn: "1–2 times" },
        { value: "several", label: "3-5 ครั้ง", labelEn: "3–5 times" },
        { value: "frequent", label: "มากกว่า 5 ครั้ง", labelEn: "More than 5 times" },
      ],
    },
  ],
};

// ─── Step 5: Tourist visa specific ─────────────────────────────────────────
const touristStep: Step = {
  id: "tourist_specific",
  title: "รายละเอียดการท่องเที่ยว",
  titleEn: "Trip Details",
  emoji: "🏖️",
  questions: [
    {
      id: "tripDuration",
      type: "radio",
      question: "ระยะเวลาที่ต้องการอยู่",
      questionEn: "Intended stay duration",
      required: true,
      conditionKey: "visaType",
      conditionValue: "tourist",
      options: [
        { value: "under1m", label: "น้อยกว่า 1 เดือน", labelEn: "Less than 1 month" },
        { value: "1_3m", label: "1–3 เดือน", labelEn: "1–3 months" },
        { value: "over3m", label: "มากกว่า 3 เดือน", labelEn: "More than 3 months" },
      ],
    },
    {
      id: "travelPurpose",
      type: "radio",
      question: "จุดประสงค์หลักในการเดินทาง",
      questionEn: "Main purpose of travel",
      required: true,
      conditionKey: "visaType",
      conditionValue: "tourist",
      options: [
        { value: "vacation", label: "พักผ่อน / ท่องเที่ยว", labelEn: "Holiday / Tourism", emoji: "🏖️" },
        { value: "visit_family", label: "เยี่ยมครอบครัว / เพื่อน", labelEn: "Visit family / friends", emoji: "👨‍👩‍👧" },
        { value: "medical", label: "รักษาพยาบาล", labelEn: "Medical treatment", emoji: "🏥" },
        { value: "transit", label: "แวะพัก (Transit)", labelEn: "Transit", emoji: "✈️" },
      ],
    },
  ],
};

// ─── Step 5: Student visa specific ─────────────────────────────────────────
const studentStep: Step = {
  id: "student_specific",
  title: "รายละเอียดการศึกษา",
  titleEn: "Study Details",
  emoji: "🎓",
  questions: [
    {
      id: "hasAcceptanceLetter",
      type: "radio",
      question: "มี Acceptance Letter / CAS จากสถาบันหรือยัง?",
      questionEn: "Do you have an Acceptance Letter / CAS from the institution?",
      required: true,
      conditionKey: "visaType",
      conditionValue: "student",
      options: [
        { value: "yes", label: "มีแล้ว", labelEn: "Yes, I have it", emoji: "✅" },
        { value: "applied", label: "กำลังรอ", labelEn: "Waiting / Applied", emoji: "⏳" },
        { value: "no", label: "ยังไม่มี", labelEn: "Not yet", emoji: "❌" },
      ],
    },
    {
      id: "studyDuration",
      type: "radio",
      question: "ระยะเวลาที่ต้องการศึกษา",
      questionEn: "Intended study duration",
      required: true,
      conditionKey: "visaType",
      conditionValue: "student",
      options: [
        { value: "under6m", label: "น้อยกว่า 6 เดือน", labelEn: "Less than 6 months (Short course)" },
        { value: "6m_1y", label: "6 เดือน – 1 ปี", labelEn: "6 months – 1 year" },
        { value: "1_3y", label: "1–3 ปี (ป.ตรี / ป.โท)", labelEn: "1–3 years (Bachelor's / Master's)" },
        { value: "over3y", label: "มากกว่า 3 ปี", labelEn: "More than 3 years" },
      ],
    },
  ],
};

// ─── Step 5: Work visa specific ─────────────────────────────────────────────
const workStep: Step = {
  id: "work_specific",
  title: "รายละเอียดการทำงาน",
  titleEn: "Work Details",
  emoji: "💼",
  questions: [
    {
      id: "hasJobOffer",
      type: "radio",
      question: "มี Job Offer / Certificate of Sponsorship (CoS) แล้วหรือยัง?",
      questionEn: "Do you have a Job Offer / CoS?",
      required: true,
      conditionKey: "visaType",
      conditionValue: "work",
      options: [
        { value: "yes", label: "มีแล้ว", labelEn: "Yes, I have it", emoji: "✅" },
        { value: "no", label: "ยังไม่มี", labelEn: "Not yet", emoji: "❌" },
      ],
    },
    {
      id: "englishLevel",
      type: "radio",
      question: "ระดับภาษาอังกฤษ (สำหรับ UK/Schengen/USA/Canada)",
      questionEn: "English proficiency level",
      required: true,
      conditionKey: "visaType",
      conditionValue: "work",
      options: [
        { value: "none", label: "ไม่มีผลสอบ", labelEn: "No certificate" },
        { value: "ielts_below6", label: "IELTS < 6.0", labelEn: "IELTS < 6.0" },
        { value: "ielts_6_7", label: "IELTS 6.0–7.0", labelEn: "IELTS 6.0–7.0" },
        { value: "ielts_above7", label: "IELTS > 7.0", labelEn: "IELTS > 7.0" },
        { value: "other_cert", label: "มีผลสอบอื่น (TOEFL/OET)", labelEn: "Other certificate (TOEFL/OET)" },
      ],
    },
  ],
};

// ─── Step 6: Consent ────────────────────────────────────────────────────────
const consentStep: Step = {
  id: "consent",
  title: "ยืนยันและส่งข้อมูล",
  titleEn: "Review & Submit",
  emoji: "✅",
  questions: [
    {
      id: "consentAccuracy",
      type: "consent",
      question:
        "ข้าพเจ้าขอรับรองว่าข้อมูลทั้งหมดในแบบฟอร์มนี้เป็นความจริง และข้าพเจ้ายินยอมรับผิดชอบหากข้อมูลไม่ถูกต้อง",
      questionEn:
        "I hereby confirm that all information provided in this form is accurate and true. I accept full responsibility if any information is found to be incorrect.",
      required: true,
    },
  ],
};

// ─── All steps in order ─────────────────────────────────────────────────────
export const ALL_STEPS: Step[] = [
  personalInfoStep,
  branchingStep,
  financialStep,
  travelHistoryStep,
  touristStep,
  studentStep,
  workStep,
  consentStep,
];

/** Returns the steps that are relevant given current answers */
export function getActiveSteps(answers: Record<string, string | string[]>): Step[] {
  const visaType = answers["visaType"] as string | undefined;

  const visaSpecificIds: Record<string, string> = {
    tourist: "tourist_specific",
    student: "student_specific",
    work: "work_specific",
    business: "work_specific",
    family: "tourist_specific",
  };

  const relevantVisaStepId = visaType ? visaSpecificIds[visaType] : null;

  return ALL_STEPS.filter((step) => {
    // Skip visa-specific steps that don't match current visa type
    if (["tourist_specific", "student_specific", "work_specific"].includes(step.id)) {
      return step.id === relevantVisaStepId;
    }
    return true;
  });
}
