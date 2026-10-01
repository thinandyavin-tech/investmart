import { NextResponse, NextRequest } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { isCoolingDown } from "@/lib/ai/health";

export const dynamic    = "force-dynamic";
export const maxDuration = 10;

interface ProviderStatus {
  name:        string;
  configured:  boolean;
  primary:     boolean;
  cooling?:    boolean; // true = rate-limited, on 15-min cooldown
}

/**
 * Reports which AI providers are configured and their health status.
 * Safe to call from monitoring dashboards — no live AI calls.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;
  const primaryName  = (process.env.AI_PRIMARY  ?? "cerebras").toLowerCase();
  const fallbackName = (process.env.AI_FALLBACK ?? "groq,nvidia,gemini").toLowerCase();

  const ALL_PROVIDERS = [
    { name: "cerebras", key: process.env.CEREBRAS_API_KEY },
    { name: "groq",     key: process.env.GROQ_API_KEY },
    { name: "nvidia",   key: process.env.NVIDIA_NIM_API_KEY },
    { name: "gemini",   key: process.env.GEMINI_API_KEY },
    // local excluded on Vercel
    ...(!process.env.VERCEL ? [{ name: "local", key: process.env.LOCAL_AI_BASE_URL }] : []),
  ];

  const providers: ProviderStatus[] = await Promise.all(
    ALL_PROVIDERS.map(async ({ name, key }) => ({
      name,
      configured: Boolean(key),
      primary:    primaryName === name,
      cooling:    Boolean(key) ? await isCoolingDown(name) : undefined,
    }))
  );

  const activeProviders = providers.filter((p) => p.configured && !p.cooling);
  const ok = activeProviders.length > 0;

  return NextResponse.json(
    {
      ok,
      primary:     primaryName,
      fallback:    fallbackName,
      providers:   providers.filter(p => p.configured),
      activeCount: activeProviders.length,
    },
    { status: ok ? 200 : 503 },
  );
}
