"use client";

import Link from "next/link";

import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { PortfolioChart } from "@/components/home/PortfolioChart";
import { AiPortfolioCard } from "@/components/profile/AiPortfolioCard";
import { TierBadge } from "@/components/TierBadge";
import { getBadgeDef } from "@/lib/traderTier";

const STARTING_THB = 1_250_000;
const FALLBACK_FX  = 35.2;

function Avatar({ initial }: { initial: string }) {
  return (
    <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#5B8A2A] p-1 flex-shrink-0">
      <div className="w-full h-full rounded-full bg-[#5B8A2A] flex items-center justify-center text-white text-xl font-bold">
        {initial}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading, initDemo, signOut } = useUser();
  const { t } = useI18n();

  const initial     = user ? (user.name?.[0] ?? user.username?.[0] ?? "D").toUpperCase() : "?";
  const displayName = user?.name ?? user?.username ?? "นักลงทุน";
  const handle      = user?.username ? `@${user.username}` : `#${user?.id.slice(-6) ?? "------"}`;

  const costBasis   = user?.holdings.reduce((s, h) => s + h.shares * h.avgCost, 0) ?? 0;
  const totalThb    = user
    ? user.cashThb + user.cashUsd * FALLBACK_FX + costBasis * FALLBACK_FX
    : 0;
  const pnl      = totalThb - STARTING_THB;
  const pnlPct   = (pnl / STARTING_THB) * 100;
  const pnlPos   = pnl >= 0;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-3">

        {/* First-time Google user: prompt to set username */}
        {!loading && user && !user.username && !user.isDemo && (
          <Card className="p-3 flex items-center justify-between gap-3" style={{ borderColor: "#5B8A2A", borderWidth: 2 }}>
            <p className="text-xs text-[#1F1A14] leading-relaxed">
              <span className="font-bold">{t.auth.welcomeNew.split("!")[0]}!</span>{" "}{t.auth.welcomeNew.split("! ")[1]}
            </p>
            <Link href="/settings/id">
              <OffsetButton size="sm" variant="lime">{t.auth.setNow}</OffsetButton>
            </Link>
          </Card>
        )}

        {/* Header */}
        <Card className="p-4">
          <div className="flex items-start gap-4">
            {loading ? (
              <div className="w-16 h-16 rounded-full bg-[#E8E2D4] animate-pulse" />
            ) : (
              <Avatar initial={initial} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-sm font-bold">
                      {loading ? t.common.loading : displayName}
                    </h1>
                    {!loading && user && <TierBadge tier={user.tier} size="xs" />}
                  </div>
                  <p className="text-xs text-[#8A8378]">{loading ? "..." : handle}</p>
                </div>
                {!loading && user && (
                  <Link href="/profile/edit">
                    <OffsetButton size="sm">{t.common.edit}</OffsetButton>
                  </Link>
                )}
              </div>
              {!loading && user?.bio && (
                <p className="text-xs text-[#8A8378] mt-1.5 leading-relaxed">{user.bio}</p>
              )}
              {!loading && !user?.bio && user && (
                <p className="text-xs italic text-[#8A8378] mt-1.5">
                  {t.profile.noBio}
                  <Link href="/profile/edit" className="underline text-[#5B8A2A]">{t.profile.addBio}</Link>
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Badges */}
        {!loading && user && user.badges.length > 0 && (
          <Card className="p-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378] mb-2">{t.profile.achievements}</h2>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((key) => {
                const b = getBadgeDef(key);
                const label = (t.profile.badges as Record<string, string>)[key] ?? b.label;
                return (
                  <div
                    key={key}
                    title={b.desc}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#F8F5EF] border border-[#E8E2D4] text-xs font-bold"
                  >
                    <span aria-hidden="true">{b.icon}</span>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Portfolio Summary */}
        {!loading && user && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">{t.profile.portfolioTitle}</h2>
              <span className="text-xs text-[#8A8378]">{t.profile.totalTrades} {user.tradeCount}</span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <div>
                <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                  ฿{Math.round(totalThb).toLocaleString("th-TH")}
                </div>
                <div
                  className="text-xs font-bold mt-0.5"
                  style={{ color: pnlPos ? "#5B8A2A" : "#DC2626" }}
                >
                  {pnlPos ? "+" : ""}{Math.round(pnl).toLocaleString("th-TH")} ({pnlPos ? "+" : ""}{pnlPct.toFixed(2)}%)
                </div>
              </div>
              <div className="text-xs text-[#8A8378] mb-0.5">{t.profile.vsBaseline}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F8F5EF] border border-[#E8E2D4] p-2 text-center">
                <div className="text-xs text-[#8A8378] uppercase tracking-wide">Cash THB</div>
                <div className="text-xs font-bold mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                  ฿{Math.round(user.cashThb).toLocaleString("th-TH")}
                </div>
              </div>
              <div className="bg-[#F8F5EF] border border-[#E8E2D4] p-2 text-center">
                <div className="text-xs text-[#8A8378] uppercase tracking-wide">Cash USD</div>
                <div className="text-xs font-bold mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                  ${user.cashUsd.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#F8F5EF] border border-[#E8E2D4] p-2 text-center">
                <div className="text-xs text-[#8A8378] uppercase tracking-wide">{t.profile.stockCount(user.holdings.length)}</div>
                <div className="text-xs font-bold mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                  ${costBasis.toFixed(0)}
                </div>
              </div>
            </div>
            <p className="text-xs text-[#8A8378] mt-2">
              {t.profile.costBasis} · {t.profile.fxNote(FALLBACK_FX)}
            </p>
          </Card>
        )}

        {/* Portfolio chart */}
        {!loading && user && <PortfolioChart />}

        {/* Holdings */}
        {!loading && user && user.holdings.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-[#E8E2D4]">
              <h2 className="text-xs font-bold uppercase tracking-widest">{t.profile.holdings}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[280px]">
                <thead>
                  <tr className="border-b border-[#E8E2D4]">
                    {[t.stock.price, t.trade.shares, t.trade.avgCost, "USD"].map((h) => (
                      <th key={h} className="text-left px-3 py-1.5 text-xs text-[#8A8378] uppercase tracking-wide font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {user.holdings.map((h) => (
                    <tr key={h.ticker} className="border-b border-[#E8E2D4] last:border-0">
                      <td className="px-3 py-2">
                        <Link href={`/stock/${h.ticker}`} className="font-bold hover:underline text-[#5B8A2A]">
                          {h.ticker}
                        </Link>
                      </td>
                      <td className="px-3 py-2" style={{ fontFamily: "var(--font-mono)" }}>{h.shares}</td>
                      <td className="px-3 py-2" style={{ fontFamily: "var(--font-mono)" }}>${h.avgCost.toFixed(2)}</td>
                      <td className="px-3 py-2 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                        ${(h.shares * h.avgCost).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* AI Portfolio Analysis */}
        {!loading && user && <AiPortfolioCard />}

        {/* Actions */}
        <Card className="p-3">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-2">{t.profile.toolsTitle}</h2>
          {[
            { href: "/radar",       label: t.profile.tools.radar,       icon: "📡" },
            { href: "/market",      label: t.profile.tools.market,      icon: "📈" },
            { href: "/exchange",    label: t.profile.tools.exchange,    icon: "💱" },
            { href: "/history",     label: t.profile.tools.history,     icon: "📋" },
            { href: "/watchlist",   label: t.profile.tools.watchlist,   icon: "👁" },
            { href: "/leaderboard", label: t.profile.tools.leaderboard, icon: "🏆" },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 border border-[#E8E2D4] mb-1.5 last:mb-0 text-xs hover:bg-[#1F1A14] hover:text-white transition-colors"
            >
              <span>{icon}</span>
              <span className="font-bold">{label}</span>
              <span className="ml-auto text-[#8A8378]">›</span>
            </Link>
          ))}
        </Card>

        {/* Settings */}
        {!loading && user && (
          <div className="flex gap-2">
            <Link href="/settings/id" className="flex-1">
              <OffsetButton variant="black" className="w-full text-center text-xs">
                {t.profile.settingsId}
              </OffsetButton>
            </Link>
            <Link href="/profile/edit" className="flex-1">
              <OffsetButton variant="lime" className="w-full text-center text-xs">
                {t.profile.editBtn}
              </OffsetButton>
            </Link>
          </div>
        )}

        {/* Sign-out for real accounts */}
        {!loading && user && !user.isDemo && (
          <div className="flex gap-2">
            <OffsetButton
              variant="black"
              className="flex-1 text-center text-xs"
              onClick={() => void signOut()}
            >
              {t.profile.signOutBtn}
            </OffsetButton>
          </div>
        )}

        {/* Login prompt */}
        {!loading && !user && (
          <Card className="p-4 text-center flex flex-col gap-2">
            <p className="text-xs text-[#8A8378]">{t.profile.signInPrompt}</p>
            <div className="flex gap-2 justify-center">
              <Link href="/signin">
                <OffsetButton variant="black">{t.common.signIn}</OffsetButton>
              </Link>
              <Link href="/signup">
                <OffsetButton variant="lime">{t.common.signUp}</OffsetButton>
              </Link>
            </div>
            <p className="text-xs text-[#8A8378]">หรือ{" "}
              <button onClick={initDemo} className="underline text-[#5B8A2A] font-bold">เริ่มเล่น (demo)</button>
            </p>
          </Card>
        )}

        <p className="text-xs text-[#8A8378] text-center pb-2">
          InvestMart · <Link href="/about" className="hover:underline">เกี่ยวกับ</Link>{" "}·{" "}
          <Link href="/privacy" className="hover:underline">ความเป็นส่วนตัว</Link>{" "}·{" "}
          <Link href="/terms" className="hover:underline">ข้อกำหนด</Link>
        </p>
      </div>
    </AppShell>
  );
}
