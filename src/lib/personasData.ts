export type DesignTheme = "clean" | "dense" | "dark" | "visual";
export type Feature = "charts" | "alerts" | "social" | "ai-portfolio" | "screener";

// All rate/margin fields stored as decimals (e.g. 0.10 = 10%)
export interface RdcfPreset {
  wacc:           number;
  g:              number;
  terminalMargin: number;
  taxRate:        number;
  roic:           number;
  n:              number;
  maxPenetration: number;
  buffer:         number;
  absoluteCap:    number;
  rationale:      string;
}

export interface Persona {
  id:          string;
  name:        string;
  age:         number;
  role:        string;
  style:       string;
  designVote:  DesignTheme;
  featureVote: Feature;
  color:       string;
  rdcfPreset:  RdcfPreset;
}

export const DESIGN_THEMES: Record<DesignTheme, { label: string; desc: string; color: string; bg: string }> = {
  clean:  { label: "Clean Slate",  desc: "ขาว-เทา เรียบ อ่านง่าย",    color: "#0F172A", bg: "#F8FAFC" },
  dense:  { label: "Data Dense",   desc: "ข้อมูลหนาแน่น compact",       color: "#1D4ED8", bg: "#EFF6FF" },
  dark:   { label: "Bold Dark",    desc: "พื้นหลังดำ accent neon",       color: "#7C3AED", bg: "#1E1B4B" },
  visual: { label: "Soft Visual",  desc: "สีอ่อน gradient เป็นมิตร",    color: "#D97706", bg: "#FFFBEB" },
};

export const FEATURES: Record<Feature, { label: string; desc: string; icon: string }> = {
  "charts":       { label: "Advanced Charts",  desc: "Candlestick + technical indicators",   icon: "📈" },
  "alerts":       { label: "Price Alerts",     desc: "Push notification เมื่อราคาถึงเป้า",   icon: "🔔" },
  "social":       { label: "Social Feed",      desc: "ติดตามนักลงทุน แชร์ thesis",           icon: "👥" },
  "ai-portfolio": { label: "AI Portfolio",     desc: "AI วิเคราะห์ portfolio ทั้งหมด",       icon: "🤖" },
  "screener":     { label: "Custom Screener",  desc: "กรองหุ้นด้วย criteria ของตัวเอง",      icon: "🔍" },
};

export const PERSONAS: Persona[] = [
  {
    id: "p1", name: "นิ่ม นวลน้อง", age: 22, role: "นักศึกษา", color: "#EC4899",
    designVote: "visual", featureVote: "social",
    style: "เพิ่งเริ่มลงทุน ชอบเรียนรู้ผ่าน social media และ influencer",
    rdcfPreset: { wacc: 0.10, g: 0.03, terminalMargin: 0.15, taxRate: 0.21, roic: 0.12,
      n: 10, maxPenetration: 0.20, buffer: 0.08, absoluteCap: 0.40,
      rationale: "เน้น safety margin สูง ยังเรียนรู้อยู่ ขอ buffer กว้างและ cap ต่ำเพื่อความปลอดภัย" },
  },
  {
    id: "p2", name: "อาร์ม อัศวิน", age: 28, role: "Software Engineer", color: "#3B82F6",
    designVote: "dense", featureVote: "charts",
    style: "สาย data ชอบดู metrics เยอะๆ ต้องการ API integration",
    rdcfPreset: { wacc: 0.105, g: 0.03, terminalMargin: 0.22, taxRate: 0.21, roic: 0.22,
      n: 10, maxPenetration: 0.30, buffer: 0.04, absoluteCap: 0.45,
      rationale: "Software มี margin สูงและ ROIC ดี ใช้ตัวเลขที่สมเหตุสมผลสำหรับ tech company คุณภาพสูง" },
  },
  {
    id: "p3", name: "เบส บัณฑิต", age: 35, role: "Financial Manager", color: "#10B981",
    designVote: "clean", featureVote: "ai-portfolio",
    style: "เน้น fundamental analysis อ่าน 10-K เป็นงาน ต้องการข้อมูลลึก",
    rdcfPreset: { wacc: 0.10, g: 0.03, terminalMargin: 0.18, taxRate: 0.21, roic: 0.15,
      n: 10, maxPenetration: 0.25, buffer: 0.05, absoluteCap: 0.45,
      rationale: "Standard assumptions ตาม best practice ทางการเงิน — textbook baseline ที่ใช้ได้กับหุ้นทั่วไป" },
  },
  {
    id: "p4", name: "ฝน ฝนทิพย์", age: 45, role: "เจ้าของธุรกิจ", color: "#F59E0B",
    designVote: "clean", featureVote: "alerts",
    style: "เวลาน้อย ต้องการข้อมูลสรุปไว ไม่ซับซ้อน ดูได้ใน 30 วินาที",
    rdcfPreset: { wacc: 0.11, g: 0.025, terminalMargin: 0.15, taxRate: 0.21, roic: 0.12,
      n: 7, maxPenetration: 0.20, buffer: 0.08, absoluteCap: 0.40,
      rationale: "Conservative มาก N สั้นกว่าเพราะไม่แน่ใจ long-term WACC สูงขึ้นหน่อยเผื่อความไม่แน่นอน" },
  },
  {
    id: "p5", name: "กาย กายสิทธิ์", age: 30, role: "Content Creator", color: "#8B5CF6",
    designVote: "visual", featureVote: "social",
    style: "สาย visual ชอบ infographic และ chart สวยๆ สร้างคอนเทนต์แชร์ได้",
    rdcfPreset: { wacc: 0.09, g: 0.03, terminalMargin: 0.15, taxRate: 0.21, roic: 0.15,
      n: 10, maxPenetration: 0.35, buffer: 0.05, absoluteCap: 0.50,
      rationale: "Optimistic view ชอบ growth story WACC ต่ำหน่อย MaxPen สูงเพราะเชื่อใน disruption" },
  },
  {
    id: "p6", name: "นิว นิวัตน์", age: 19, role: "นักเทรดมือใหม่", color: "#6366F1",
    designVote: "dark", featureVote: "charts",
    style: "มาจากสาย crypto ชอบ interface มืดๆ ดู premium และ cool",
    rdcfPreset: { wacc: 0.12, g: 0.03, terminalMargin: 0.10, taxRate: 0.21, roic: 0.15,
      n: 5, maxPenetration: 0.30, buffer: 0.03, absoluteCap: 0.80,
      rationale: "Short horizon แบบ crypto N=5 cap สูงเพราะรับ volatility ได้มาก buffer แน่นเพราะชอบ action" },
  },
  {
    id: "p7", name: "ปาล์ม ปาลิดา", age: 32, role: "Marketing Manager", color: "#14B8A6",
    designVote: "clean", featureVote: "alerts",
    style: "ลงทุนระยะยาว DCA ทุกเดือน ไม่ค่อยดูราคา ต้องการแจ้งเตือน",
    rdcfPreset: { wacc: 0.10, g: 0.03, terminalMargin: 0.14, taxRate: 0.21, roic: 0.14,
      n: 10, maxPenetration: 0.25, buffer: 0.06, absoluteCap: 0.40,
      rationale: "DCA passive ไม่รีบตัดสินใจ buffer ปานกลาง margin อนุรักษ์นิยมเหมาะสำหรับหุ้นทั่วไป" },
  },
  {
    id: "p8", name: "โอ๊ต โอภาส", age: 40, role: "นักลงทุนเชิงระบบ", color: "#64748B",
    designVote: "dense", featureVote: "screener",
    style: "ใช้ quant model กรองหุ้น ต้องการ screener ละเอียดและส่งออก CSV ได้",
    rdcfPreset: { wacc: 0.10, g: 0.03, terminalMargin: 0.20, taxRate: 0.21, roic: 0.20,
      n: 10, maxPenetration: 0.30, buffer: 0.03, absoluteCap: 0.45,
      rationale: "Systematic quant — ROIC สูงสำหรับ quality company buffer แน่น 3% เพราะใช้กับ screener จำนวนมาก" },
  },
  {
    id: "p9", name: "เต้ เตชิต", age: 25, role: "Day Trader", color: "#EF4444",
    designVote: "dense", featureVote: "charts",
    style: "เทรดทุกวัน ต้องการ real-time data chart เร็ว และ Level 2 quotes",
    rdcfPreset: { wacc: 0.12, g: 0.03, terminalMargin: 0.12, taxRate: 0.21, roic: 0.15,
      n: 5, maxPenetration: 0.25, buffer: 0.03, absoluteCap: 0.60,
      rationale: "Short-term catalyst focus N=5 เพราะดู setup ระยะสั้น WACC สูงรับความไม่แน่นอน" },
  },
  {
    id: "p10", name: "มิ้น มินตา", age: 27, role: "พยาบาล", color: "#F472B6",
    designVote: "clean", featureVote: "alerts",
    style: "ลงทุนเพิ่มรายได้ ต้องการ app ใช้งานง่ายในมือถือระหว่างพัก",
    rdcfPreset: { wacc: 0.10, g: 0.03, terminalMargin: 0.12, taxRate: 0.21, roic: 0.12,
      n: 10, maxPenetration: 0.20, buffer: 0.08, absoluteCap: 0.40,
      rationale: "Very conservative ขอ safety margin กว้าง margin ต่ำเพราะระมัดระวัง ไม่อยากรับ risk สูง" },
  },
  {
    id: "p11", name: "เฟิร์น เฟิร์นลดา", age: 31, role: "นักบัญชี", color: "#059669",
    designVote: "dense", featureVote: "screener",
    style: "ชอบ spreadsheet-style ข้อมูลครบ filter ได้หลายมิติ ไม่ต้องสวยมาก",
    rdcfPreset: { wacc: 0.10, g: 0.028, terminalMargin: 0.17, taxRate: 0.23, roic: 0.16,
      n: 10, maxPenetration: 0.25, buffer: 0.04, absoluteCap: 0.45,
      rationale: "ปรับ g ตาม long-run real GDP, tax ตาม effective rate จริง ROIC ปานกลาง-สูง แบบ accounting-accurate" },
  },
  {
    id: "p12", name: "ต้น ตนัย", age: 38, role: "แพทย์", color: "#0284C7",
    designVote: "clean", featureVote: "ai-portfolio",
    style: "Passive investor เน้น ETF ต้องการ risk analysis และ portfolio balance",
    rdcfPreset: { wacc: 0.11, g: 0.03, terminalMargin: 0.15, taxRate: 0.21, roic: 0.14,
      n: 10, maxPenetration: 0.20, buffer: 0.07, absoluteCap: 0.40,
      rationale: "Risk-adjusted return สำคัญที่สุด WACC สูงขึ้นเล็กน้อยเพื่อความปลอดภัย buffer กว้าง" },
  },
  {
    id: "p13", name: "ปิ๊ก ปิยวัฒน์", age: 24, role: "Crypto Native", color: "#7C3AED",
    designVote: "dark", featureVote: "charts",
    style: "สลับมาจาก DeFi ต้องการ interface ที่ดู premium มีพลังงาน",
    rdcfPreset: { wacc: 0.15, g: 0.03, terminalMargin: 0.10, taxRate: 0.21, roic: 0.20,
      n: 5, maxPenetration: 0.40, buffer: 0.02, absoluteCap: 1.00,
      rationale: "High-risk high-reward DeFi mindset N สั้น cap สูงมาก WACC 15% รับ crypto-level uncertainty" },
  },
  {
    id: "p14", name: "แจ๊ค จักรภพ", age: 50, role: "นักลงทุนมืออาชีพ", color: "#1D4ED8",
    designVote: "clean", featureVote: "ai-portfolio",
    style: "ประสบการณ์ 20 ปี เน้น value investing ต้องการข้อมูลที่น่าเชื่อถือ",
    rdcfPreset: { wacc: 0.11, g: 0.025, terminalMargin: 0.20, taxRate: 0.21, roic: 0.18,
      n: 10, maxPenetration: 0.25, buffer: 0.08, absoluteCap: 0.35,
      rationale: "Value investor 20 ปี — conservative มากที่สุด g ต่ำ WACC สูง cap ต่ำ margin of safety กว้างสุด" },
  },
  {
    id: "p15", name: "เอ็ม เอกภพ", age: 29, role: "Quant Analyst", color: "#475569",
    designVote: "dense", featureVote: "charts",
    style: "ต้องการ raw data export backtesting tools และ factor analysis",
    rdcfPreset: { wacc: 0.103, g: 0.03, terminalMargin: 0.19, taxRate: 0.21, roic: 0.22,
      n: 10, maxPenetration: 0.30, buffer: 0.03, absoluteCap: 0.45,
      rationale: "Damodaran-aligned WACC ตาม sector ROIC สูงสำหรับ high-quality factor buffer แน่น 3% สำหรับ systematic screen" },
  },
  {
    id: "p16", name: "ปู ปุณยาพร", age: 36, role: "แม่บ้านนักลงทุน", color: "#D97706",
    designVote: "visual", featureVote: "social",
    style: "เรียนรู้จาก YouTube ชอบ UI สวยงาม อ่านง่าย ไม่กลัวหุ้นขึ้นลง",
    rdcfPreset: { wacc: 0.10, g: 0.03, terminalMargin: 0.13, taxRate: 0.21, roic: 0.13,
      n: 10, maxPenetration: 0.25, buffer: 0.07, absoluteCap: 0.40,
      rationale: "Moderate conservative เรียนรู้จาก YouTube buffer กว้างพอ margin อนุรักษ์นิยมเพราะยังไม่ชำนาญ" },
  },
  {
    id: "p17", name: "เบิร์ด เบิร์ดภพ", age: 42, role: "ผู้ประกอบการ", color: "#0891B2",
    designVote: "clean", featureVote: "ai-portfolio",
    style: "Busy ต้องการ executive summary ด่วน AI ช่วยวิเคราะห์ portfolio",
    rdcfPreset: { wacc: 0.11, g: 0.03, terminalMargin: 0.18, taxRate: 0.21, roic: 0.17,
      n: 7, maxPenetration: 0.30, buffer: 0.05, absoluteCap: 0.45,
      rationale: "Business owner มองแบบ operating business N=7 เพราะธุรกิจเปลี่ยนเร็ว WACC สูงขึ้น เผื่อ macro risk" },
  },
  {
    id: "p18", name: "พลอย พลอยไพลิน", age: 23, role: "Finance Influencer", color: "#DB2777",
    designVote: "dark", featureVote: "social",
    style: "สร้างคอนเทนต์หุ้น ต้องการ share-friendly UI และ community features",
    rdcfPreset: { wacc: 0.09, g: 0.03, terminalMargin: 0.16, taxRate: 0.21, roic: 0.15,
      n: 10, maxPenetration: 0.40, buffer: 0.04, absoluteCap: 0.55,
      rationale: "Growth story content ชอบ narrative ที่น่าตื่นเต้น WACC ต่ำ MaxPen สูงเพราะเชื่อใน big TAM thesis" },
  },
  {
    id: "p19", name: "ไอซ์ ไอศวรรย์", age: 33, role: "พนักงานธนาคาร", color: "#2563EB",
    designVote: "dense", featureVote: "alerts",
    style: "เข้าใจ finance ดี ต้องการ alert ราคา yield spread และ macro data",
    rdcfPreset: { wacc: 0.10, g: 0.03, terminalMargin: 0.17, taxRate: 0.22, roic: 0.15,
      n: 10, maxPenetration: 0.25, buffer: 0.05, absoluteCap: 0.45,
      rationale: "Bank analyst standard — tax สูงขึ้นเล็กน้อยตาม effective rate จริง ทุกอย่างอยู่ใน professional consensus" },
  },
  {
    id: "p20", name: "กล้า กล้าณรงค์", age: 48, role: "อาจารย์การเงิน", color: "#9333EA",
    designVote: "dark", featureVote: "ai-portfolio",
    style: "ต้องการ methodology ชัดเจน citation แหล่งที่มา และ academic rigor",
    rdcfPreset: { wacc: 0.10, g: 0.025, terminalMargin: 0.18, taxRate: 0.21, roic: 0.15,
      n: 10, maxPenetration: 0.20, buffer: 0.05, absoluteCap: 0.40,
      rationale: "Academic rigor — g ต่ำกว่า nominal GDP (real GDP ~2.5%) MaxPen ต่ำเพราะ competition ระยะยาวกัดกร่อน moat" },
  },
];
