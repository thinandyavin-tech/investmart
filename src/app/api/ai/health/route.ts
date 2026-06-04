import { NextResponse } from "next/server";

export const dynamic    = "force-dynamic";
export const maxDuration = 30;

interface ProviderStatus {
  name:        string;
  configured:  boolean;
  primary:     boolean;
}

/**
 * Reports which AI providers are configured.
 * Does not make live API calls — only inspects env vars.
 * Safe to call from monitoring dashboards.
 */
export async function GET(): Promise<NextResponse> {
  const primaryName  = (process.env.AI_PRIMARY  ?? "groq").toLowerCase();
  const fallbackName = (process.env.AI_FALLBACK ?? "gemini").toLowerCase();

  const providers: ProviderStatus[] = [
    {
      name:       "groq",
      configured: Boolean(process.env.GROQ_API_KEY),
      primary:    primaryName === "groq",
    },
    {
      name:       "gemini",
      configured: Boolean(process.env.GEMINI_API_KEY),
      primary:    primaryName === "gemini",
    },
    {
      name:       "local",
      configured: Boolean(process.env.LOCAL_AI_BASE_URL),
      primary:    primaryName === "local",
    },
  ];

  const activeProviders = providers.filter((p) => p.configured);
  const ok = activeProviders.length > 0;

  return NextResponse.json(
    {
      ok,
      primary:  primaryName,
      fallback: fallbackName,
      providers,
      activeCount: activeProviders.length,
    },
    { status: ok ? 200 : 503 },
  );
}
