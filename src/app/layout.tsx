import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Inter, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "@/lib/userContext";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

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

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit:  "cover",
};

export const metadata: Metadata = {
  title: {
    default: "InvestMart",
    template: "%s — InvestMart",
  },
  description:
    "เว็บโซเชียลมีเดียหุ้นอเมริกา · ดู PNL ranking holdings ของเทรดเดอร์ · วิเคราะห์หุ้นด้วย AI บน InvestMart",
  metadataBase: new URL("https://investmart.vercel.app"),
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: "https://investmart.vercel.app",
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
      <head>
        {/* Inline script prevents FOUC when dark mode is the user's stored preference */}
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body
        className="min-h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        style={{
          fontFamily:
            "var(--font-noto-thai), var(--font-inter), system-ui, sans-serif",
        }}
      >
        <ThemeProvider>
          <UserProvider>
            {children}
            <OnboardingFlow />
            <ServiceWorkerRegistrar />
            <Analytics />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
