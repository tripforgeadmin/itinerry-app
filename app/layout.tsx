import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "itinerry Visa Assessment · เช็คโอกาสผ่านวีซ่า",
  description: "ประเมินโอกาสผ่านวีซ่าของคุณกับ itinerry — ใช้เวลาเพียง 2 นาที",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
