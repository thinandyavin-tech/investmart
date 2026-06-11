import { NextIntlClientProvider }  from "next-intl";
import { UserProvider }            from "@/lib/userContext";
import { I18nProvider }            from "@/lib/i18n";
import { OnboardingFlow }          from "@/components/OnboardingFlow";
import { ServiceWorkerRegistrar }  from "@/components/ServiceWorkerRegistrar";
import { CookieConsentBanner }     from "@/components/CookieConsentBanner";
import { Analytics }               from "@vercel/analytics/react";
import { LangAttrSetter }          from "@/components/LangAttrSetter";
import { routing }                 from "@/i18n/routing";

interface Props {
  children: React.ReactNode;
  params:   Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    // NextIntlClientProvider exposes useLocale() to all client components.
    // I18nProvider reads locale from useLocale() — always in sync with URL.
    // Empty messages: translations live in our own catalog (translations.ts).
    <NextIntlClientProvider locale={locale} messages={{}}>
      <I18nProvider>
        <LangAttrSetter locale={locale} />
        <UserProvider>
          {children}
          <OnboardingFlow />
          <CookieConsentBanner />
          <ServiceWorkerRegistrar />
          <Analytics />
        </UserProvider>
      </I18nProvider>
    </NextIntlClientProvider>
  );
}
