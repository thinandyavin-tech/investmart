import { NextIntlClientProvider } from "next-intl";
import { UserProvider }           from "@/lib/userContext";
import { I18nProvider }           from "@/lib/i18n";
import { OnboardingFlow }         from "@/components/OnboardingFlow";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { ThemeProvider }          from "@/components/ThemeProvider";
import { Analytics }              from "@vercel/analytics/react";
import type { Lang }              from "@/lib/i18n";
import { LangAttrSetter }         from "@/components/LangAttrSetter";
import { routing }                from "@/i18n/routing";

interface Props {
  children: React.ReactNode;
  params:   Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const lang: Lang = locale === "th" ? "th" : "en";

  return (
    // NextIntlClientProvider gives locale context to next-intl's Link/useRouter
    // We pass empty messages — translations live in our own i18n system
    <NextIntlClientProvider locale={locale} messages={{}}>
      <I18nProvider initialLocale={lang}>
        <LangAttrSetter locale={locale} />
        <ThemeProvider>
          <UserProvider>
            {children}
            <OnboardingFlow />
            <ServiceWorkerRegistrar />
            <Analytics />
          </UserProvider>
        </ThemeProvider>
      </I18nProvider>
    </NextIntlClientProvider>
  );
}
