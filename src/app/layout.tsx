import type { Metadata } from "next";
import { Noto_Sans_Thai, Inter, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "@/lib/userContext";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "InvestMart",
    template: "%s — InvestMart",
  },
  description:
    "พอร์ตหุ้นจำลอง ไม่ใช้เงินจริง · paper trading game · เว็บโซเชียลมีเดียหุ้นอเมริกา + text based AI social · ดู PNL ranking holdings ของเทรดเดอร์ InvestMart",
  metadataBase: new URL("https://investneet.com"),
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: "https://investneet.com",
    siteName: "InvestMart",
    images: [{ url: "/og-image.jpg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-[#FBF7ED] text-[#1F1A14]"
        style={{
          fontFamily:
            "var(--font-noto-thai), var(--font-inter), system-ui, sans-serif",
        }}
      >
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
