import { NextRequest, NextResponse } from "next/server";

import { generateText } from "@/lib/aiService";
import { applyRateLimit } from "@/lib/rateLimit";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

interface CacheEntry { reason: string; ts: number }
const cache = new Map<string, CacheEntry>();
const TTL   = 60 * 60 * 1000; // 1 hour

interface FinnhubNewsItem { headline: string; summary: string }
interface FinnhubQuote    { c: number; dp: number; d: number; h: number; l: number; o: number; pc: number }
interface FinnhubProfile  { name?: string; finnhubIndustry?: string; marketCapitalization?: number }

const SYSTEM_PROMPT = `คุณคือนักวิเคราะห์หุ้นอาวุโสระดับ Wall Street ที่เชี่ยวชาญตลาดหุ้นสหรัฐ ทำงานให้กับ InvestMart แพลตฟอร์มเรียนรู้การลงทุน (การวิเคราะห์นี้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำลงทุน)

วิธีการวิเคราะห์:
1. ระบุสาเหตุหลักของการเคลื่อนไหวจากข้อมูลที่ให้มา — ข่าวสำคัญ, งบการเงิน, sector event, หรือ macro
2. ถ้ามีข่าวที่เกี่ยวข้องโดยตรง ให้อ้างอิงใจความสำคัญของข่าวนั้น
3. ถ้าไม่มีข่าวเฉพาะ ให้ระบุอย่างซื่อตรงว่าอาจเป็น broad market move, sector rotation, หรือ technical movement
4. ห้ามสร้างข้อมูลที่ไม่มีในข้อมูลที่ให้มา — ถ้าไม่ชัดเจนให้บอกตรงๆ

รูปแบบการตอบ:
- ภาษาไทยชัดเจน กระชับ มืออาชีพ อ่านง่าย — 2-3 ประโยค
- ไม่ขึ้นต้นด้วยชื่อหุ้น ticker หรือ "หุ้น X"
- ตอบเป็นย่อหน้าต่อเนื่อง ไม่ใช้ bullet points หรือ headers
- ไม่ต้องมีคำปฏิเสธความรับผิดชอบ`;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(req, "ai");
  if (limited) return limited;

  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  if (!symbol || !TICKER_RE.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ reason: cached.reason, symbol });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const now  = Math.floor(Date.now() / 1000);
  const week = now - 7 * 24 * 3600;
  const fromDate = new Date(week * 1000).toISOString().slice(0, 10);
  const toDate   = new Date(now  * 1000).toISOString().slice(0, 10);

  const [newsRes, quoteRes, profileRes] = await Promise.allSettled([
    fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${toDate}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    ),
    fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    ),
    fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    ),
  ]);

  const news: FinnhubNewsItem[] =
    newsRes.status === "fulfilled" && newsRes.value.ok
      ? ((await newsRes.value.json()) as FinnhubNewsItem[]).slice(0, 6)
      : [];

  const quote: FinnhubQuote | null =
    quoteRes.status === "fulfilled" && quoteRes.value.ok
      ? ((await quoteRes.value.json()) as FinnhubQuote)
      : null;

  const profile: FinnhubProfile | null =
    profileRes.status === "fulfilled" && profileRes.value.ok
      ? ((await profileRes.value.json()) as FinnhubProfile)
      : null;

  const companyName = profile?.name ?? symbol;
  const industry    = profile?.finnhubIndustry ?? "";

  const priceLines: string[] = [];
  if (quote) {
    const dir = quote.dp >= 0 ? "+" : "";
    priceLines.push(`ราคา: $${quote.c.toFixed(2)} (${dir}${quote.dp.toFixed(2)}%, ${dir}$${quote.d.toFixed(2)})`);
    priceLines.push(`วันนี้: เปิด $${quote.o.toFixed(2)} | สูง $${quote.h.toFixed(2)} | ต่ำ $${quote.l.toFixed(2)} | ปิดเมื่อวาน $${quote.pc.toFixed(2)}`);
  }

  const newsBlock = news.length
    ? news.map((n, i) => `${i + 1}. ${n.headline}${n.summary ? ` — ${n.summary.slice(0, 120)}` : ""}`).join("\n")
    : "ไม่มีข่าวล่าสุดใน 7 วัน";

  const prompt = `# ${companyName} (${symbol})${industry ? ` — ${industry}` : ""}

## ข้อมูลราคา
${priceLines.length ? priceLines.join("\n") : "ไม่มีข้อมูลราคา"}

## ข่าวล่าสุด 7 วัน
${newsBlock}

อธิบายเป็นภาษาไทยว่าทำไมราคาหุ้นนี้ถึงเคลื่อนไหวแบบนี้วันนี้`;

  const MAX_ATTEMPTS = 3;
  let lastErr = "";
  let reason  = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      reason = (await generateText(prompt, SYSTEM_PROMPT, {
        maxTokens:   500,
        temperature: 0.25,
      })).trim();
      if (reason.length > 10) break;
      throw new Error("empty response");
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      console.warn(`[whymoving] attempt ${attempt}/${MAX_ATTEMPTS}: ${lastErr.slice(0, 80)}`);
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 600 * attempt));
    }
  }

  if (!reason) return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  cache.set(symbol, { reason, ts: Date.now() });
  return NextResponse.json({ reason, symbol });
}
