// Guided Learning Journey — step definitions and progress utilities.
// Progress is stored in localStorage (fast, works for demo users)
// and synced to DB for real-auth users (cross-device).

export const JOURNEY_STORAGE_KEY = "investmart_journey_v2";
export const READINESS_STORAGE_KEY = "investmart_readiness_v1";

export interface JourneyStep {
  readonly id:          string;
  readonly titleEn:     string;
  readonly titleTh:     string;
  readonly descEn:      string;
  readonly descTh:      string;
  readonly actionEn:    string;
  readonly actionTh:    string;
  readonly href:        string | null;   // null = opens guided modal
  readonly icon:        string;
  readonly isAutoDetected: boolean;      // true = completed when tradeCount > 0
}

export const JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    id: "foundations",
    titleEn: "Foundations",
    titleTh: "พื้นฐานการลงทุน",
    descEn: "Learn the financial fundamentals: cash flow, emergency fund, and the investment pyramid.",
    descTh: "เรียนรู้พื้นฐานทางการเงิน: cash flow, กองทุนฉุกเฉิน, และ investment pyramid",
    actionEn: "Read the Blueprint →",
    actionTh: "อ่าน Blueprint →",
    href: "/blueprint",
    icon: "🗺️",
    isAutoDetected: false,
  },
  {
    id: "radar",
    titleEn: "Analyze a Stock",
    titleTh: "วิเคราะห์หุ้นด้วย Martin",
    descEn: "Use the Radar to discover momentum stocks and let Martin explain what's moving them.",
    descTh: "ใช้ Radar ค้นหาหุ้น momentum และให้ Martin อธิบายว่าอะไรกำลังขับเคลื่อน",
    actionEn: "Open the Radar →",
    actionTh: "เปิด Radar →",
    href: "/radar",
    icon: "📡",
    isAutoDetected: false,
  },
  {
    id: "first-trade",
    titleEn: "Your First Paper Trade",
    titleTh: "ซื้อขายหุ้นจำลองครั้งแรก",
    descEn: "Pick a stock, read Martin's take, and place your first paper trade. No real money — just practice.",
    descTh: "เลือกหุ้น อ่านมุมมอง Martin และลองซื้อขายหุ้นจำลองครั้งแรก ไม่ใช้เงินจริง",
    actionEn: "Make Your First Trade →",
    actionTh: "เริ่มเทรดหุ้นจำลอง →",
    href: null,  // triggers GuidedFirstTrade modal
    icon: "🎯",
    isAutoDetected: true,  // auto-complete when tradeCount > 0
  },
  {
    id: "fundamental",
    titleEn: "Fundamental Analysis",
    titleTh: "วิเคราะห์พื้นฐานหุ้น",
    descEn: "Learn how to read a company's financials: revenue growth, margins, FCF, and moat indicators.",
    descTh: "เรียนรู้วิธีอ่านงบการเงิน: revenue growth, margins, FCF, และตัวชี้วัด moat",
    actionEn: "Read the Lesson →",
    actionTh: "อ่านบทเรียน →",
    href: "/learn/fundamental",
    icon: "📊",
    isAutoDetected: false,
  },
  {
    id: "playbook",
    titleEn: "Thematic Growth Playbook",
    titleTh: "คู่มือลงทุนหุ้นเติบโตเชิงธีม",
    descEn: "Apply the 7-pillar thematic growth framework to any stock using real data.",
    descTh: "นำกรอบ 7 เสา thematic growth ไปใช้กับหุ้นจริงด้วยข้อมูลจริง",
    actionEn: "Open Playbook →",
    actionTh: "เปิด Playbook →",
    href: "/playbook",
    icon: "📖",
    isAutoDetected: false,
  },
] as const;

export interface ReadinessAnswer {
  positiveCashFlow:   boolean | null;
  emergencyFund:      boolean | null;
  highInterestDebt:   boolean | null;
  timeHorizon:        "short" | "medium" | "long" | "veryLong" | null;
  drawdownTolerance:  "panic" | "hold" | "opportunity" | null;
}

export interface ReadinessResult {
  ready:          boolean;
  caution:        string[];  // list of things to address first
  startAtStep:    number;    // 0-indexed step index to highlight
  summaryEn:      string;
  summaryTh:      string;
}

export function evaluateReadiness(a: ReadinessAnswer): ReadinessResult {
  const caution: string[] = [];

  if (a.positiveCashFlow === false) {
    caution.push("positiveCashFlow");
  }
  if (a.emergencyFund === false) {
    caution.push("emergencyFund");
  }
  if (a.highInterestDebt === true) {
    caution.push("highInterestDebt");
  }
  if (a.timeHorizon === "short") {
    caution.push("timeHorizon");
  }

  const ready = caution.length === 0;

  if (!ready) {
    return {
      ready, caution,
      startAtStep: 0,
      summaryEn: "Before paper trading, it helps to have your financial foundation solid. Start with Foundations to build the base.",
      summaryTh: "ก่อนเริ่มเทรดหุ้นจำลอง แนะนำให้สร้างฐานการเงินให้แข็งแกร่งก่อน เริ่มด้วย Foundations",
    };
  }

  return {
    ready, caution,
    startAtStep: 0,
    summaryEn: "Your financial foundation looks solid. Start your learning journey below — paper trading first, real investing when you're ready.",
    summaryTh: "ฐานการเงินของคุณดูดี! เริ่มเส้นทางการเรียนรู้ได้เลย — เทรดจำลองก่อน ลงทุนจริงเมื่อพร้อม",
  };
}

export interface LocalJourneyState {
  completedSteps:   string[];
  readinessDone:    boolean;
  readinessSkipped: boolean;
}

export function loadLocalJourney(): LocalJourneyState {
  if (typeof window === "undefined") {
    return { completedSteps: [], readinessDone: false, readinessSkipped: false };
  }
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (!raw) return { completedSteps: [], readinessDone: false, readinessSkipped: false };
    return JSON.parse(raw) as LocalJourneyState;
  } catch {
    return { completedSteps: [], readinessDone: false, readinessSkipped: false };
  }
}

export function saveLocalJourney(state: LocalJourneyState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state));
}

export function mergeJourneyState(
  local: LocalJourneyState,
  remote: LocalJourneyState,
): LocalJourneyState {
  const combined = Array.from(new Set([...local.completedSteps, ...remote.completedSteps]));
  return {
    completedSteps:   combined,
    readinessDone:    local.readinessDone    || remote.readinessDone,
    readinessSkipped: local.readinessSkipped || remote.readinessSkipped,
  };
}

export function getNextStep(completedSteps: string[], tradeCount: number): JourneyStep | null {
  for (const step of JOURNEY_STEPS) {
    const isDone = step.isAutoDetected
      ? tradeCount > 0
      : completedSteps.includes(step.id);
    if (!isDone) return step;
  }
  return null; // all done
}

export function getCompletionCount(completedSteps: string[], tradeCount: number): number {
  return JOURNEY_STEPS.filter(s =>
    s.isAutoDetected ? tradeCount > 0 : completedSteps.includes(s.id)
  ).length;
}
