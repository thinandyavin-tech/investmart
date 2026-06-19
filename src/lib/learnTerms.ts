/**
 * Centralized bilingual term definitions used by:
 * - InfoTooltip (contextual ⓘ on metrics)
 * - Glossary page (/glossary)
 * - Learn Hub (/learn)
 *
 * Every metric visible in the app should have an entry here.
 */

export interface LearnTerm {
  id:        string;
  th:        string;
  en:        string;
  category:  string;
  tipTh:     string;   // 1-2 sentence tooltip (Thai)
  tipEn:     string;   // 1-2 sentence tooltip (English)
  bodyTh:    string;   // full explanation (Thai)
  bodyEn:    string;   // full explanation (English)
  example?:  string;   // optional example (bilingual ok)
}

export const LEARN_TERMS: readonly LearnTerm[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // MARKET & PRICE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "market-cap", th: "มูลค่าตลาด (Market Cap)", en: "Market Capitalization",
    category: "market",
    tipTh: "มูลค่ารวมของบริษัท = ราคาหุ้น × จำนวนหุ้น",
    tipEn: "Total company value = share price × total shares outstanding.",
    bodyTh: "มูลค่ารวมของบริษัทในตลาดหุ้น คำนวณจาก ราคาหุ้น × จำนวนหุ้นทั้งหมด บริษัทที่มี market cap สูงมักเรียกว่า Large-cap",
    bodyEn: "Total company value on the stock market, calculated as share price × total shares outstanding. Companies with high market cap are called Large-cap.",
    example: "Apple $175 × 15B shares = ~$2.6T market cap",
  },
  {
    id: "volume", th: "ปริมาณซื้อขาย (Volume)", en: "Volume",
    category: "market",
    tipTh: "จำนวนหุ้นที่ซื้อขายในวันนี้ ปริมาณสูงมักหมายถึงมีข่าวสำคัญ",
    tipEn: "Number of shares traded today. High volume often signals important news.",
    bodyTh: "จำนวนหุ้นที่มีการซื้อขายในช่วงเวลาหนึ่ง ปริมาณสูงกว่าปกติมักหมายความว่ามีข่าวสำคัญหรือนักลงทุนรายใหญ่เข้ามาเกี่ยวข้อง",
    bodyEn: "Number of shares traded in a given period. Volume significantly above average usually means important news or institutional activity.",
  },
  {
    id: "volume-surge", th: "การพุ่งขึ้นของปริมาณ (Volume Surge)", en: "Volume Surge",
    category: "market",
    tipTh: "ปริมาณซื้อขายวันนี้เทียบค่าเฉลี่ย เช่น 3x = ซื้อขายหนักเป็นสามเท่า",
    tipEn: "Today's volume vs average. E.g. 3x = three times normal trading activity.",
    bodyTh: "ปริมาณซื้อขายวันนี้เทียบกับค่าเฉลี่ย เช่น volume surge 3x หมายความว่าซื้อขายหนักเป็นสามเท่าปกติ InvestMart ใช้ตัวเลขนี้เป็นหนึ่งในสัญญาณเรดาร์",
    bodyEn: "Today's volume compared to the average. E.g. volume surge 3x means 3× normal trading activity. InvestMart uses this as one of its radar signals.",
    example: "Normal: 5M shares/day · Today: 15M shares = volume surge 3x",
  },
  {
    id: "52w-range", th: "ช่วงราคา 52 สัปดาห์", en: "52-Week Range",
    category: "market",
    tipTh: "ราคาสูงสุดและต่ำสุดในรอบหนึ่งปี ช่วยดูตำแหน่งราคาปัจจุบัน",
    tipEn: "Highest and lowest prices in the past year. Helps gauge current price position.",
    bodyTh: "ราคาสูงสุดและต่ำสุดในรอบหนึ่งปีที่ผ่านมา ใช้ดูว่าราคาปัจจุบันอยู่ตรงไหนของช่วงนั้น ราคาใกล้ high อาจเป็นสัญญาณ breakout หรือ overbought ก็ได้",
    bodyEn: "Highest and lowest prices over the past year. Helps see where the current price sits. Price near the high may signal a breakout or overbought condition.",
    example: "Price $180 · 52W High $195 · 52W Low $130 → 77% of range",
  },
  {
    id: "change-1d", th: "เปลี่ยนแปลงวันนี้ (1-Day Change)", en: "1-Day Change",
    category: "market",
    tipTh: "% เปลี่ยนแปลงจากราคาปิดเมื่อวาน",
    tipEn: "% change from yesterday's closing price.",
    bodyTh: "เปอร์เซ็นต์เปลี่ยนแปลงจากราคาปิดเมื่อวาน คำนวณจาก (ราคาปัจจุบัน - ราคาปิดเมื่อวาน) / ราคาปิดเมื่อวาน × 100",
    bodyEn: "Percentage change from yesterday's close. Calculated as (current price - previous close) / previous close × 100.",
  },
  {
    id: "underlying-price", th: "ราคาหุ้นอ้างอิง", en: "Underlying Price",
    category: "market",
    tipTh: "ราคาหุ้นตัวจริงที่ออปชันอ้างอิงอยู่",
    tipEn: "The actual stock price that an option is based on.",
    bodyTh: "ราคาหุ้นตัวจริง (เช่น ASTS Price) ที่ออปชันอ้างอิงอยู่ ราคานี้เป็นตัวกำหนดว่าออปชันจะมีมูลค่าจริง (intrinsic value) หรือไม่",
    bodyEn: "The actual stock price (e.g. ASTS Price) that the option is based on. This determines whether the option has intrinsic value.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNDAMENTALS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "pe", th: "P/E Ratio", en: "Price-to-Earnings Ratio",
    category: "fundamental",
    tipTh: "ราคาหุ้นหารกำไรต่อหุ้น P/E สูง = คาดหวังการเติบโต",
    tipEn: "Stock price / earnings per share. High P/E = high growth expectations.",
    bodyTh: "อัตราส่วนราคาต่อกำไรต่อหุ้น บอกว่านักลงทุนยอมจ่ายกี่บาทต่อกำไร 1 บาท P/E สูงมักหมายถึงนักลงทุนคาดหวังการเติบโต ในขณะที่ P/E ต่ำอาจหมายความว่าหุ้นถูกหรือธุรกิจกำลังมีปัญหา",
    bodyEn: "Share price divided by earnings per share. Shows how much investors pay per $1 of earnings. High P/E usually means high growth expectations; low P/E may mean the stock is cheap or the business is struggling.",
    example: "Price $100 · EPS $5 → P/E = 20 (paying $20 per $1 of earnings)",
  },
  {
    id: "eps", th: "กำไรต่อหุ้น (EPS)", en: "Earnings Per Share",
    category: "fundamental",
    tipTh: "กำไรสุทธิหารจำนวนหุ้น EPS ที่เพิ่มขึ้นเสมอ = ธุรกิจแข็งแกร่ง",
    tipEn: "Net income / total shares. Consistently growing EPS = strong business.",
    bodyTh: "กำไรสุทธิของบริษัทหารด้วยจำนวนหุ้นที่ออกจำหน่าย EPS ที่เพิ่มขึ้นต่อเนื่องมักเป็นสัญญาณธุรกิจที่แข็งแกร่ง",
    bodyEn: "Company's net income divided by total shares outstanding. Consistently growing EPS is usually a sign of a strong business.",
  },
  {
    id: "dividend-yield", th: "อัตราเงินปันผล", en: "Dividend Yield",
    category: "fundamental",
    tipTh: "เงินปันผลต่อปี / ราคาหุ้น แสดงเป็น %",
    tipEn: "Annual dividend / share price, shown as a percentage.",
    bodyTh: "เงินปันผลต่อปีหารด้วยราคาหุ้น แสดงเป็นเปอร์เซ็นต์ หุ้นปันผลสูงให้กระแสเงินสดสม่ำเสมอ แต่บริษัทที่เติบโตเร็วมักไม่จ่ายปันผล",
    bodyEn: "Annual dividend divided by share price. High-dividend stocks provide steady cash flow, but fast-growing companies often don't pay dividends.",
    example: "Dividend $2/yr · Price $50 → Yield = 4%",
  },
  {
    id: "beta", th: "Beta", en: "Beta",
    category: "fundamental",
    tipTh: "ความผันผวนเทียบตลาด Beta 1.5 = ผันผวนมากกว่าตลาด 50%",
    tipEn: "Volatility vs market. Beta 1.5 = 50% more volatile than the market.",
    bodyTh: "วัดความผันผวนของหุ้นเทียบกับดัชนีตลาด Beta 1.0 = เคลื่อนไหวเหมือนตลาด · Beta > 1 = ผันผวนมากกว่า · Beta < 1 = เสถียรกว่า",
    bodyEn: "Measures stock volatility vs market index. Beta 1.0 = moves like market · Beta > 1 = more volatile · Beta < 1 = more stable.",
    example: "Beta 1.5: market up 10% → stock tends to move ~15%",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "rsi", th: "RSI — ดัชนีความแข็งแกร่งสัมพัทธ์", en: "Relative Strength Index (RSI)",
    category: "technical",
    tipTh: "ค่า 0-100 บอกว่าหุ้น overbought (>70) หรือ oversold (<30)",
    tipEn: "0-100 scale showing if a stock is overbought (>70) or oversold (<30).",
    bodyTh: "ตัวชี้วัด momentum ค่า 0–100 RSI > 70 = overbought (ราคาอาจพุ่งเกินจริง) RSI < 30 = oversold (ราคาอาจตกเกินจริง) InvestMart คำนวณ RSI-14",
    bodyEn: "Momentum indicator on a 0-100 scale. RSI > 70 = overbought (price may have risen too fast). RSI < 30 = oversold. InvestMart calculates RSI-14.",
    example: "RSI 78 = overbought · watch for a pullback (not always a sell signal)",
  },
  {
    id: "momentum", th: "โมเมนตัม", en: "Momentum",
    category: "technical",
    tipTh: "แนวโน้มว่าหุ้นที่กำลังขึ้นจะขึ้นต่อ สามารถพลิกกลับได้เสมอ",
    tipEn: "Tendency for rising stocks to keep rising. Can always reverse.",
    bodyTh: "แนวโน้มว่าหุ้นที่กำลังขึ้นจะขึ้นต่อ และหุ้นที่กำลังลงจะลงต่อ เรดาร์ InvestMart คัดหุ้นที่มี momentum สูงผิดปกติ แต่ momentum สามารถพลิกกลับได้เสมอ",
    bodyEn: "Tendency for stocks moving in one direction to continue. InvestMart's radar flags unusually high momentum, but momentum can always reverse.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONS CORE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "call-option", th: "Call Option (สิทธิซื้อ)", en: "Call Option",
    category: "options",
    tipTh: "สัญญาที่ให้สิทธิ 'ซื้อ' หุ้นในราคาที่กำหนด (strike) ก่อนวันหมดอายุ",
    tipEn: "A contract giving the right to 'buy' shares at a set price (strike) before expiry.",
    bodyTh: "สัญญาที่ให้สิทธิผู้ถือในการซื้อหุ้นอ้างอิงในราคาที่กำหนดไว้ (strike price) ก่อนหรือในวันหมดอายุ ผู้ซื้อ call option กำไรเมื่อราคาหุ้นอ้างอิงสูงกว่า strike price + premium ที่จ่ายไป",
    bodyEn: "A contract that gives the holder the right to buy the underlying stock at a set price (strike) on or before the expiration date. Call buyers profit when the stock price exceeds strike + premium paid.",
  },
  {
    id: "put-option", th: "Put Option (สิทธิขาย)", en: "Put Option",
    category: "options",
    tipTh: "สัญญาที่ให้สิทธิ 'ขาย' หุ้นในราคาที่กำหนด (strike) ก่อนวันหมดอายุ",
    tipEn: "A contract giving the right to 'sell' shares at a set price (strike) before expiry.",
    bodyTh: "สัญญาที่ให้สิทธิผู้ถือในการขายหุ้นอ้างอิงในราคาที่กำหนดไว้ (strike price) ก่อนหรือในวันหมดอายุ ผู้ซื้อ put option กำไรเมื่อราคาหุ้นอ้างอิงต่ำกว่า strike price - premium ที่จ่ายไป",
    bodyEn: "A contract that gives the holder the right to sell the underlying stock at a set price (strike) before expiry. Put buyers profit when the stock drops below strike - premium paid.",
  },
  {
    id: "strike-price", th: "ราคาใช้สิทธิ (Strike Price)", en: "Strike Price",
    category: "options",
    tipTh: "ราคาที่ตกลงไว้ล่วงหน้า ที่ผู้ถือออปชันมีสิทธิซื้อ/ขายหุ้นจริง",
    tipEn: "The agreed price at which the option holder can buy/sell the actual shares.",
    bodyTh: "ราคาที่ตกลงไว้ล่วงหน้าในสัญญาออปชัน ที่ผู้ถือมีสิทธิซื้อ (call) หรือขาย (put) หุ้นอ้างอิง ราคา strike เป็นตัวกำหนดว่าออปชันเป็น ITM, ATM, หรือ OTM",
    bodyEn: "The pre-agreed price in the option contract at which the holder can buy (call) or sell (put) the underlying stock. Strike determines whether the option is ITM, ATM, or OTM.",
  },
  {
    id: "expiry", th: "วันหมดอายุ (Expiration)", en: "Expiration Date",
    category: "options",
    tipTh: "วันสุดท้ายที่ออปชันมีผล หลังจากนี้ออปชันจะหมดมูลค่า",
    tipEn: "The last day the option is valid. After this, the option expires worthless if OTM.",
    bodyTh: "วันสุดท้ายที่ออปชันสามารถใช้สิทธิได้ หากออปชันหมดอายุขณะที่เป็น OTM (ราคาหุ้น < strike สำหรับ call) ออปชันจะหมดมูลค่าเป็น $0 — ผู้ถือเสียเงินค่า premium ทั้งหมด",
    bodyEn: "The last day the option can be exercised. If an OTM option expires (stock < strike for calls), it becomes worthless at $0 — the holder loses the entire premium paid.",
  },
  {
    id: "premium", th: "ค่าออปชัน (Premium)", en: "Option Premium",
    category: "options",
    tipTh: "ราคาที่จ่ายเพื่อซื้อสัญญาออปชัน ประกอบด้วย intrinsic value + time value",
    tipEn: "The price paid to buy an option contract. Composed of intrinsic value + time value.",
    bodyTh: "ราคาที่จ่ายเพื่อซื้อสัญญาออปชัน ประกอบด้วย intrinsic value (มูลค่าที่แท้จริง) + time value (มูลค่าเวลา) ยิ่งเวลาเหลือมาก premium ยิ่งสูง เมื่อเวลาผ่านไป time value จะลดลง (theta decay)",
    bodyEn: "The price paid to buy an option contract. Made up of intrinsic value (real value now) + time value (value from time remaining). More time = higher premium. Time value decays as expiry approaches (theta decay).",
  },
  {
    id: "contract", th: "สัญญาออปชัน (Contract)", en: "Options Contract",
    category: "options",
    tipTh: "1 สัญญา = 100 หุ้น เช่น 25 สัญญา = ควบคุม 2,500 หุ้น — นี่คือ leverage",
    tipEn: "1 contract = 100 shares. E.g. 25 contracts = 2,500 shares — this is leverage.",
    bodyTh: "1 สัญญาออปชันควบคุมหุ้น 100 หุ้น ดังนั้น 25 สัญญา = ควบคุม 2,500 หุ้น นี่คือ leverage — คุณจ่ายเพียง premium แต่ได้ exposure เท่ากับหุ้นจำนวนมาก ทั้งกำไรและขาดทุนจึงขยายตัว",
    bodyEn: "1 option contract controls 100 shares. So 25 contracts = 2,500 shares. This is leverage — you pay only the premium but get exposure to many shares. Both gains and losses are amplified.",
    example: "Premium $1.56 × 25 contracts × 100 shares = $3,900 total cost",
  },
  {
    id: "breakeven", th: "จุดคุ้มทุน (Breakeven)", en: "Breakeven Price",
    category: "options",
    tipTh: "ราคาหุ้นที่ต้องเกินจุดนี้ การเทรดจึงเริ่มมีกำไร Call: strike + premium",
    tipEn: "Stock price needed for the trade to start profiting. Call: strike + premium.",
    bodyTh: "ราคาหุ้นอ้างอิงที่การเทรดออปชันเริ่มมีกำไร สำหรับ call option: breakeven = strike + premium ที่จ่ายไป สำหรับ put option: breakeven = strike - premium",
    bodyEn: "The underlying stock price at which the option trade starts to profit. For calls: breakeven = strike + premium paid. For puts: breakeven = strike - premium.",
    example: "Call strike $90 + premium $1.56 → breakeven = $91.56",
  },
  {
    id: "exercise", th: "ใช้สิทธิ (Exercise)", en: "Exercise",
    category: "options",
    tipTh: "แปลงออปชันเป็นหุ้นจริง สมเหตุผลเฉพาะเมื่อเป็น ITM เท่านั้น",
    tipEn: "Converting an option into actual shares. Only rational when ITM.",
    bodyTh: "การแปลงสิทธิในสัญญาออปชันเป็นหุ้นจริง — call = ซื้อหุ้นในราคา strike, put = ขายหุ้นในราคา strike การ exercise สมเหตุผลเฉพาะเมื่อออปชันเป็น ITM เท่านั้น ถ้า OTM = ขาดทุนเพิ่ม",
    bodyEn: "Converting the option right into actual shares — call = buy at strike, put = sell at strike. Exercise is only rational when the option is ITM. If OTM, exercising would add more losses.",
  },
  {
    id: "itm-otm-atm", th: "ITM / OTM / ATM", en: "In/Out/At The Money",
    category: "options",
    tipTh: "ITM: มีมูลค่าจริง · OTM: ยังไม่มีมูลค่า · ATM: ราคาหุ้น ≈ strike",
    tipEn: "ITM: has intrinsic value · OTM: no intrinsic value · ATM: stock ≈ strike.",
    bodyTh: "ITM (In The Money): ออปชันมีมูลค่าที่แท้จริง — call: ราคาหุ้น > strike, put: ราคาหุ้น < strike · OTM (Out of The Money): ไม่มีมูลค่าที่แท้จริง · ATM (At The Money): ราคาหุ้น ≈ strike",
    bodyEn: "ITM (In The Money): option has intrinsic value — call: stock > strike, put: stock < strike. OTM: no intrinsic value. ATM: stock ≈ strike.",
    example: "Call strike $90, stock at $79 → OTM (no intrinsic value, expires worthless)",
  },
  {
    id: "intrinsic-time-value", th: "มูลค่าที่แท้จริง vs มูลค่าเวลา", en: "Intrinsic Value vs Time Value",
    category: "options",
    tipTh: "Intrinsic = มูลค่าจริงตอนนี้ · Time value = มูลค่าจากเวลาที่เหลือ",
    tipEn: "Intrinsic = real value now · Time value = value from time remaining.",
    bodyTh: "Intrinsic value: มูลค่าที่แท้จริงถ้าใช้สิทธิตอนนี้ (เช่น call strike $80, หุ้น $85 → intrinsic = $5) · Time value: ส่วนที่เหลือของ premium ที่มาจากเวลาที่ยังเหลือ ยิ่งใกล้หมดอายุ time value ยิ่งลดลงเร็ว",
    bodyEn: "Intrinsic value: real value if exercised now (e.g. call strike $80, stock $85 → intrinsic = $5). Time value: the rest of the premium from remaining time. Decays faster as expiry approaches.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GREEKS & VOLATILITY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "delta", th: "Delta (เดลต้า)", en: "Delta",
    category: "greeks",
    tipTh: "ราคาออปชันเปลี่ยนเท่าไรเมื่อหุ้นขยับ $1 เช่น delta 0.5 = +$0.50/$1",
    tipEn: "How much the option price changes per $1 stock move. Delta 0.5 = +$0.50 per $1.",
    bodyTh: "วัดว่าราคาออปชันเปลี่ยนเท่าไรเมื่อราคาหุ้นอ้างอิงเปลี่ยน $1 เช่น delta 0.5 = ออปชันขึ้น $0.50 เมื่อหุ้นขึ้น $1 delta ยังเป็นการประมาณคร่าวๆ ว่าออปชันจะ finish ITM มากน้อยเท่าไร",
    bodyEn: "Measures how much the option price changes per $1 move in the stock. Delta 0.5 = option gains $0.50 per $1 stock gain. Delta also roughly estimates the probability of finishing ITM.",
  },
  {
    id: "theta", th: "Theta (ทีต้า)", en: "Theta",
    category: "greeks",
    tipTh: "มูลค่าที่ออปชันเสียไปต่อวัน เช่น theta -$0.05 = เสีย $5/วัน (100 หุ้น)",
    tipEn: "Value the option loses per day. Theta -$0.05 = loses $5/day per contract.",
    bodyTh: "การเสื่อมค่าของออปชันตามเวลา (time decay) ต่อวัน เช่น theta -$0.05 = ออปชันเสียมูลค่า $0.05 ต่อหุ้นต่อวัน (= $5 ต่อสัญญา) ออปชัน OTM ใกล้หมดอายุจะ decay เร็วมาก",
    bodyEn: "Time decay — how much value an option loses per day. Theta -$0.05 = option loses $0.05/share/day ($5/contract). Far-OTM options near expiry decay very rapidly.",
  },
  {
    id: "iv", th: "ความผันผวนโดยนัย (IV)", en: "Implied Volatility",
    category: "greeks",
    tipTh: "ความผันผวนที่ตลาดคาดหวัง — IV สูง = premium แพง",
    tipEn: "Market's expected volatility priced into the option — high IV = expensive premiums.",
    bodyTh: "ความผันผวนที่ตลาดคาดหวังซึ่งรวมอยู่ในราคาออปชัน IV สูงหมายถึง premium แพง (ตลาดคาดว่าราคาจะเคลื่อนไหวมาก) IV ต่ำ = premium ถูก IV มักพุ่งก่อนประกาศผลประกอบการ",
    bodyEn: "The market's expected volatility priced into the option. High IV = expensive premiums (market expects large price moves). Low IV = cheap premiums. IV often spikes before earnings announcements.",
  },
  {
    id: "open-interest", th: "สัญญาคงค้าง (Open Interest)", en: "Open Interest",
    category: "greeks",
    tipTh: "จำนวนสัญญาออปชันที่ยังเปิดอยู่ในตลาด แตกต่างจาก volume ที่นับเฉพาะวันนี้",
    tipEn: "Total option contracts currently open. Different from volume which counts only today.",
    bodyTh: "จำนวนสัญญาออปชันทั้งหมดที่ยังเปิดอยู่ (ยังไม่ปิด ยังไม่ exercise ยังไม่หมดอายุ) แตกต่างจาก volume ที่นับเฉพาะการซื้อขายวันนี้ OI สูง = สภาพคล่องดี",
    bodyEn: "Total option contracts currently outstanding (not yet closed, exercised, or expired). Different from volume which counts today's trades only. High OI = good liquidity.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PORTFOLIO / ACCOUNT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "holding-value", th: "มูลค่าการถือครอง", en: "Holding Value",
    category: "portfolio",
    tipTh: "มูลค่าตลาดปัจจุบันของตำแหน่ง = ราคาปัจจุบัน × จำนวนหุ้น/สัญญา",
    tipEn: "Current market value of the position = current price × shares/contracts.",
    bodyTh: "มูลค่าตลาดปัจจุบันของตำแหน่งที่ถือ = ราคาปัจจุบัน × จำนวนหุ้นหรือสัญญา สำหรับออปชัน = ราคาออปชัน × จำนวนสัญญา × 100",
    bodyEn: "Current market value of a position = current price × number of shares or contracts. For options: option price × contracts × 100.",
  },
  {
    id: "total-cost", th: "ต้นทุนรวม (Total Cost)", en: "Total Cost",
    category: "portfolio",
    tipTh: "เงินที่จ่ายไปซื้อตำแหน่งนี้ทั้งหมด",
    tipEn: "Total amount paid to acquire this position.",
    bodyTh: "จำนวนเงินทั้งหมดที่จ่ายเพื่อซื้อตำแหน่งนี้ สำหรับออปชัน = premium × จำนวนสัญญา × 100 สำหรับหุ้น = ราคาซื้อเฉลี่ย × จำนวนหุ้น",
    bodyEn: "Total amount paid to open this position. For options: premium × contracts × 100. For stocks: average buy price × number of shares.",
    example: "25 contracts × $1.56 × 100 = $3,900 total cost",
  },
  {
    id: "unrealized-pnl", th: "กำไร/ขาดทุนที่ยังไม่รับรู้", en: "Unrealized P/L",
    category: "portfolio",
    tipTh: "กำไร/ขาดทุนบนกระดาษ = มูลค่าปัจจุบัน - ต้นทุน ยังไม่ได้ขายจริง",
    tipEn: "Paper gain/loss = current value - cost. Not yet realized by selling.",
    bodyTh: "ผลต่างระหว่างมูลค่าตลาดปัจจุบันกับต้นทุนที่ซื้อมา ยังไม่ได้ขายจริง ถือเป็นแค่ตัวเลขบนกระดาษ จะกลายเป็น realized เมื่อขายหุ้นออกไปแล้ว",
    bodyEn: "The difference between current market value and what you paid. It's just a number on paper until you sell. It becomes realized P/L only after closing the position.",
    example: "Bought 100 shares @ $50 · Now $65 → Unrealized P/L = +$1,500",
  },
  {
    id: "total-asset-value", th: "มูลค่าสินทรัพย์รวม", en: "Total Asset Value",
    category: "portfolio",
    tipTh: "มูลค่ารวมของทุกตำแหน่ง + เงินสดในพอร์ต",
    tipEn: "Total value of all positions + cash in the portfolio.",
    bodyTh: "ผลรวมของมูลค่าตลาดของทุกตำแหน่งที่ถือ + เงินสดคงเหลือ เป็นตัวเลขที่บอกมูลค่ารวมของพอร์ตทั้งหมด ณ เวลาปัจจุบัน",
    bodyEn: "Sum of market value of all positions + remaining cash. This number shows the total portfolio value at the current moment.",
  },
  {
    id: "exchange-rate", th: "อัตราแลกเปลี่ยน", en: "Exchange Rate",
    category: "portfolio",
    tipTh: "อัตราที่ใช้แปลง USD ↔ THB เช่น 1 USD = 32.72 THB",
    tipEn: "The rate used to convert USD ↔ THB. E.g. 1 USD = 32.72 THB.",
    bodyTh: "อัตราแลกเปลี่ยน USD↔THB ที่ InvestMart ใช้คำนวณมูลค่าพอร์ตเป็นบาทไทย อัตรานี้อัพเดตจาก Frankfurter (ECB) หรือ Bank of Thailand ทุกครั้งที่มีการแลกเปลี่ยน",
    bodyEn: "The USD↔THB exchange rate InvestMart uses to calculate portfolio value in Thai Baht. Updated from Frankfurter (ECB) or Bank of Thailand on each exchange.",
  },
  {
    id: "avg-cost", th: "ต้นทุนเฉลี่ย (Avg Cost)", en: "Average Cost Per Share",
    category: "portfolio",
    tipTh: "ราคาเฉลี่ยที่ซื้อหุ้นมาทั้งหมด = ต้นทุนรวม ÷ จำนวนหุ้น",
    tipEn: "Average price paid for all shares = total cost ÷ number of shares.",
    bodyTh: "ราคาเฉลี่ยที่ซื้อหุ้นมาทั้งหมด คำนวณจากต้นทุนรวมหารด้วยจำนวนหุ้นที่ถือ ถ้าซื้อหลายครั้งในราคาต่างกัน ตัวเลขนี้บอกว่าราคาต้องสูงกว่าเท่าไรจึงจะมีกำไร",
    bodyEn: "Average price paid across all purchases. Calculated as total cost ÷ shares held. If bought at different prices, this tells you the price needed to be above for profit.",
    example: "50 shares @ $40 + 50 shares @ $60 → Avg Cost = $50",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INVESTMART RADAR
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "momentum-score", th: "Momentum Score", en: "Momentum Score",
    category: "investmart",
    tipTh: "คะแนน 0-100 จาก breakout (50%) + quality (30%) + volume (20%) ไม่ใช่การรับประกันว่าจะขึ้นต่อ",
    tipEn: "0-100 score from breakout (50%) + quality (30%) + volume (20%). Not a guarantee.",
    bodyTh: "คะแนน 0–100 ที่ InvestMart คำนวณจาก breakout score (50%), quality score (30%) และ volume factor (20%) คะแนนสูงหมายถึงหุ้นมีการเคลื่อนไหวที่ผิดปกติ ไม่ใช่การรับประกันว่าจะขึ้นต่อ",
    bodyEn: "0-100 score calculated from breakout score (50%), quality score (30%), and volume factor (20%). A high score means unusual movement — not a guarantee of continued gains.",
  },
  {
    id: "breakout-score", th: "Breakout Score", en: "Breakout Score",
    category: "investmart",
    tipTh: "ส่วนหนึ่งของ momentum score คำนวณจาก % เปลี่ยนแปลง + volume + RSI",
    tipEn: "Part of momentum score. Calculated from % change + volume + RSI.",
    bodyTh: "ส่วนหนึ่งของ momentum score คำนวณจากการเปลี่ยนแปลงราคา 1 วัน, volume surge, และ RSI มีค่า 0–100 คะแนนสูงหมายถึงหุ้นมีสัญญาณ breakout ในวันนั้น",
    bodyEn: "Part of the momentum score, calculated from 1-day price change, volume surge, and RSI. 0-100 scale. High score means the stock shows breakout signals that day.",
  },
  {
    id: "quality-score", th: "Quality Score", en: "Quality Score",
    category: "investmart",
    tipTh: "ตัวกรองความน่าเชื่อถือ — RSI 45-75, market cap สูง, volume เหมาะสม",
    tipEn: "Reliability filter — healthy RSI (45-75), high market cap, reasonable volume.",
    bodyTh: "ตัวกรองความน่าเชื่อถือของสัญญาณ ให้คะแนนหุ้นที่มี RSI ในช่วง 45–75, market cap สูง, และ volume surge เหมาะสม เพื่อคัดกรองหุ้นเล็กที่ volume พุ่งเพราะการปั่นราคา",
    bodyEn: "Signal reliability filter. Scores stocks with healthy RSI (45-75), high market cap, and reasonable volume surge. Filters out small stocks with volume spikes from manipulation.",
  },
] as const;

export function getTermById(id: string): LearnTerm | undefined {
  return LEARN_TERMS.find((t) => t.id === id);
}

export function getTermsByCategory(category: string): LearnTerm[] {
  return LEARN_TERMS.filter((t) => t.category === category);
}

export const CATEGORIES = {
  market:      { th: "ราคาและตลาด",        en: "Market & Price" },
  fundamental: { th: "การวิเคราะห์พื้นฐาน", en: "Fundamental Analysis" },
  technical:   { th: "เทคนิคอล",           en: "Technical Analysis" },
  options:     { th: "ออปชัน",             en: "Options Core" },
  greeks:      { th: "Greeks & Volatility", en: "Greeks & Volatility" },
  portfolio:   { th: "พอร์ตและบัญชี",       en: "Portfolio & Account" },
  investmart:  { th: "เครื่องมือ InvestMart", en: "InvestMart Tools" },
} as const;
