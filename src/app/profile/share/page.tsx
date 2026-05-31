import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "แชร์โปรไฟล์" };

export default function ProfileSharePage() {
  return (
    <AppShell>
      <ComingSoon
        titleThai="แชร์โปรไฟล์"
        descThai="เร็วๆ นี้: สร้างลิงก์หรือ QR code เพื่อแชร์โปรไฟล์ผู้เทรดของคุณ"
      />
    </AppShell>
  );
}
