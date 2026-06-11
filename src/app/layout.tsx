import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

const notoSansThai = Noto_Sans_Thai({
  subsets:  ["thai", "latin"],
  variable: "--font-noto-thai",
  weight:   ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  weight:   ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets:  ["latin"],
  variable: "--font-mono",
  weight:   ["400", "500"],
});

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit:  "cover",
};

export const metadata: Metadata = {
  title: {
    default:  "InvestMart",
    template: "%s — InvestMart",
  },
  description:
    "US stock social network · Paper trading simulator · AI momentum radar",
  metadataBase: new URL("https://investmart.vercel.app"),
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32",   type: "image/png" },
      { url: "/favicon.png",       sizes: "any",      type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type:      "website",
    url:       "https://investmart.vercel.app",
    siteName:  "InvestMart",
    images:    [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${notoSansThai.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body
        className="min-h-full flex flex-col text-slate-900 dark:text-slate-100"
        style={{ fontFamily: "var(--font-noto-thai), var(--font-inter), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
