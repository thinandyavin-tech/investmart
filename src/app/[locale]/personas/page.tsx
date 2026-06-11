import { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { PersonasPage } from "@/components/personas/PersonasPage";

export const metadata: Metadata = {
  title: "ชุมชน · InvestMart",
  description: "20 Personas โหวต Design และ Feature ที่อยากเห็นใน InvestMart",
};

export default function PersonasRoute() {
  return (
    <AppShell>
      <PersonasPage />
    </AppShell>
  );
}
