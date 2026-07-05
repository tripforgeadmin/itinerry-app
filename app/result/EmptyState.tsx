export default function EmptyState() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mascot/itin_main.png" alt="" className="w-40 h-40 object-contain opacity-80 mb-4" />
      <h1 className="text-lg font-bold text-primary mb-2">ยังไม่พบข้อมูลการประเมิน</h1>
      <p className="text-sm text-muted leading-relaxed mb-6 max-w-xs">
        ดูเหมือนว่าคุณยังไม่ได้ทำแบบประเมินวีซ่ากับเรา เริ่มทำได้เลยฟรี ใช้เวลาไม่ถึง 2 นาที
      </p>
      <a
        href="/auth"
        className="rounded-2xl px-6 py-3.5 text-white font-bold text-sm shadow-lg"
        style={{ backgroundColor: "#06c755", boxShadow: "0 4px 24px rgba(6,199,85,0.3)" }}
      >
        เริ่มทำแบบประเมิน
      </a>
    </main>
  );
}
