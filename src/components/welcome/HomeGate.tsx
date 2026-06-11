"use client";

import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { GuestUpgradeBanner }  from "@/components/welcome/GuestUpgradeBanner";

export function HomeGate() {
  return (
    <>
      <GuestUpgradeBanner />
      <CookieConsentBanner />
    </>
  );
}
