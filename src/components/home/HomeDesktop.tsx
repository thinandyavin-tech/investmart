"use client";

import Link from "next/link";

import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/Card";
import { FeedSection } from "@/components/social/FeedSection";
import { MarketStatusBanner } from "@/components/market/MarketStatusBanner";
import { DailyDigestCard } from "@/components/home/DailyDigestCard";
import { PortfolioHero } from "@/components/home/PortfolioHero";
import { NewsForwardSection } from "@/components/home/NewsForwardSection";
import { MarketsRail } from "@/components/home/MarketsRail";
import { TradingViewTickerTape } from "@/components/tradingview/TradingViewTickerTape";

export function HomeDesktop() {
  const { loading } = useUser();
  const { lang } = useI18n();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 pt-4 pb-0 max-w-6xl mx-auto w-full">
        <TradingViewTickerTape locale={lang} />
      </div>

      <div className="flex flex-1 gap-6 px-6 py-4 max-w-6xl mx-auto w-full">
        <section className="flex-1 min-w-0 flex flex-col gap-4">
          <MarketStatusBanner />
          {!loading && <PortfolioHero />}
          <ActionButtons />
          <DailyDigestCard />
          <NewsForwardSection />
          <PostsCard />
        </section>

        <div className="w-72 flex-shrink-0">
          <MarketsRail />
        </div>
      </div>

      <HomeFooter />
    </div>
  );
}

function ActionButtons() {
  const { t } = useI18n();
  const actions = [
    { href: "/radar",       label: t.desktop.actions.radar,    icon: "📡" },
    { href: "/market",      label: t.desktop.actions.market,   icon: "📈" },
    { href: "/exchange",    label: t.desktop.actions.exchange,  icon: "💱" },
    { href: "/history",     label: t.desktop.actions.history,   icon: "📋" },
    { href: "/leaderboard", label: t.nav.leaderboard,           icon: "🏆" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {actions.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/50 backdrop-blur-md border border-white/30 hover:bg-white/70 transition-colors group"
        >
          <span className="text-xl" aria-hidden="true">{icon}</span>
          <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 text-center leading-tight">{label}</span>
        </Link>
      ))}
    </div>
  );
}

function PostsCard() {
  const { t } = useI18n();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-[#E8E2D4]">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A8378]">{t.desktop.postsTitle}</h2>
      </div>
      <FeedSection showComposer={true} />
    </Card>
  );
}

function HomeFooter() {
  const { t } = useI18n();
  const links = [
    { href: "/",          label: t.desktop.footerLinks.home },
    { href: "/radar",     label: t.desktop.footerLinks.radar },
    { href: "/market",    label: t.desktop.footerLinks.market },
    { href: "/exchange",  label: "Exchange" },
    { href: "/history",   label: t.desktop.footerLinks.history },
    { href: "/about",     label: t.desktop.footerLinks.about },
    { href: "/privacy",   label: t.desktop.footerLinks.privacy },
    { href: "/terms",     label: t.desktop.footerLinks.terms },
  ];

  return (
    <footer className="border-t border-white/30 bg-white/50 backdrop-blur-md px-6 py-4 mt-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs text-slate-900 font-semibold mb-1">InvestMart</p>
        <div className="flex flex-wrap gap-3 text-xs mb-2">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="text-slate-400 hover:text-slate-700 underline underline-offset-2">
              {label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-slate-400">{t.desktop.disclaimer}</p>
      </div>
    </footer>
  );
}
