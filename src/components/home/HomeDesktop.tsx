"use client";

import { useUser } from "@/lib/userContext";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { FeedSection } from "@/components/social/FeedSection";
import { MarketStatusBanner } from "@/components/market/MarketStatusBanner";
import { HotNewsSection } from "@/components/home/HotNewsSection";
import { InfographicsSection } from "@/components/home/InfographicsSection";
import { DailyDigestCard } from "@/components/home/DailyDigestCard";
import { PortfolioChart } from "@/components/home/PortfolioChart";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TradingViewTickerTape } from "@/components/tradingview/TradingViewTickerTape";

export function HomeDesktop() {
  const { user, loading } = useUser();
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1 gap-6 p-6 max-w-6xl mx-auto w-full">
        {/* Left column */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-4">
          <AboutCard bio={user?.bio ?? ""} />
        </aside>

        {/* Right column */}
        <section className="flex-1 min-w-0 flex flex-col gap-4">
          <TradingViewTickerTape />
          <MarketStatusBanner />
          <PortfolioChart />
          <StatCards
            loading={loading}
            cashThb={user?.cashThb ?? null}
            cashUsd={user?.cashUsd ?? null}
            holdings={user?.holdings ?? []}
            tradeCount={user?.tradeCount ?? 0}
          />
          <div className="text-center text-xs text-slate-400/70 py-0.5 tracking-[0.2em] font-mono">
            · · · The InvestMart Simulator · · ·
          </div>
          <ActionButtons />
          <HoldingsCard holdings={user?.holdings ?? []} loading={loading} />
          {(!user || user.isDemo) && !loading && (
            <Card className="p-4 text-center flex flex-col gap-2">
              <p className="text-xs text-slate-500">
                เข้าสู่ระบบเพื่อเริ่มเล่น simulator · เริ่มต้นด้วย ฿1,250,000
              </p>
              <div className="flex gap-2 justify-center">
                <OffsetButton variant="black" onClick={() => router.push("/signin")}>
                  เข้าสู่ระบบ
                </OffsetButton>
                <OffsetButton variant="lime" onClick={() => router.push("/signup")}>
                  สมัครสมาชิก ฟรี
                </OffsetButton>
              </div>
            </Card>
          )}
          <DailyDigestCard />
          <InfographicsSection />
          <HotNewsSection />
          <PostsCard />
        </section>
      </div>
      <HomeFooter />
    </div>
  );
}

function AboutCard({ bio }: { bio: string }) {
  return (
    <Card className="p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 border-b border-white/30 pb-2 text-slate-400">
        เกี่ยวกับฉัน
      </h2>
      {bio ? (
        <p className="text-sm leading-relaxed text-slate-700">{bio}</p>
      ) : (
        <>
          <p className="text-sm italic text-slate-400 mb-3">
            ยังไม่มีคำบรรยาย — เขียนแนะนำตัวเองด้วยตัวอักษรเท่านั้น
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            InvestMart เป็นโซเชียลมีเดียหุ้นที่ใช้ตัวอักษรล้วน ไม่มีรูปโปรไฟล์ ไม่มีอีโมจิ
          </p>
        </>
      )}
    </Card>
  );
}


interface Holding {
  ticker:   string;
  shares:   number;
  avgCost:  number;
  currency: string;
}

function StatCards({
  loading,
  cashThb,
  cashUsd,
  holdings,
  tradeCount,
}: {
  loading:    boolean;
  cashThb:    number | null;
  cashUsd:    number | null;
  holdings:   Holding[];
  tradeCount: number;
}) {
  const stats = [
    {
      label: "เงินสด (THB)",
      value: loading ? "..." : cashThb != null ? `฿${cashThb.toLocaleString("th-TH")}` : "฿1,250,000",
      mono:  true,
    },
    {
      label: "เงินสด (USD)",
      value: loading ? "..." : cashUsd != null ? `$${cashUsd.toFixed(2)}` : "$0",
      mono:  true,
    },
    { label: "จำนวนหุ้น",      value: loading ? "..." : String(holdings.length) },
    { label: "คำสั่งซื้อขาย",  value: loading ? "..." : String(tradeCount)      },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(({ label, value, mono }) => (
        <Card key={label} className="p-4 text-center">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1.5 font-medium">
            {label}
          </div>
          <div
            className="text-lg font-bold text-slate-900"
            style={{ fontFamily: mono ? "var(--font-mono)" : undefined }}
          >
            {value}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ActionButtons() {
  const actions = [
    { href: "/radar",       label: "เรดาร์แสกนหุ้น", icon: "📡" },
    { href: "/market",      label: "ภาพรวมตลาด",      icon: "📈" },
    { href: "/exchange",    label: "แลกเปลี่ยนเงิน",  icon: "💱" },
    { href: "/history",     label: "ประวัติซื้อขาย",  icon: "📋" },
    { href: "/leaderboard", label: "Leaderboard",       icon: "🏆" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {actions.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/50 backdrop-blur-md border border-white/30 hover:bg-white/70 transition-colors group"
        >
          <span className="text-xl">{icon}</span>
          <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 text-center leading-tight">{label}</span>
        </Link>
      ))}
    </div>
  );
}

function HoldingsCard({ holdings, loading }: { holdings: Holding[]; loading: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-700">หุ้นที่ถืออยู่</h2>
        <Link href="/assets" className="text-xs text-violet-600 hover:text-violet-800 font-semibold transition-colors">ดูพอร์ตเต็ม →</Link>
      </div>
      {loading ? (
        <div className="text-sm text-slate-400 text-center py-4">กำลังโหลด...</div>
      ) : holdings.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-4">ยังไม่มีหุ้นในพอร์ต</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/30">
              {["หุ้น", "จำนวน", "ต้นทุนเฉลี่ย"].map((h) => (
                <th key={h} className="text-left py-2 text-xs text-slate-500 font-semibold uppercase tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.ticker} className="border-b border-white/20 last:border-0">
                <td className="py-2 font-bold text-slate-900">{h.ticker}</td>
                <td className="py-2 text-slate-600 font-mono">{h.shares}</td>
                <td className="py-2 text-slate-600 font-mono">${h.avgCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function PostsCard() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">บทความและโพสต์</h2>
      </div>
      <FeedSection showComposer={true} />
    </Card>
  );
}

function HomeFooter() {
  return (
    <footer className="border-t border-white/30 bg-white/50 backdrop-blur-md px-6 py-4 mt-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs text-slate-900 font-semibold mb-1">
          InvestMart — เว็บโซเชียลมีเดียหุ้นอเมริกา
        </p>
        <div className="flex flex-wrap gap-3 text-xs mb-2">
          {[
            { href: "/",          label: "หน้าหลัก" },
            { href: "/radar",     label: "เรดาร์แสกนหุ้น" },
            { href: "/market",    label: "ภาพรวมตลาด" },
            { href: "/exchange",  label: "Exchange" },
            { href: "/history",   label: "ประวัติซื้อขาย" },
            { href: "/about",     label: "เกี่ยวกับ" },
            { href: "/privacy",   label: "ความเป็นส่วนตัว" },
            { href: "/terms",     label: "ข้อกำหนด" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="text-slate-400 hover:text-slate-700 underline underline-offset-2">
              {label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-slate-400">© 2026 InvestMart · investmart.vercel.app · ข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน</p>
      </div>
    </footer>
  );
}
