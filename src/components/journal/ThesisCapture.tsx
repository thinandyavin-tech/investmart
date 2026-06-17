"use client";

import { useState, useRef } from "react";
import { useI18n }          from "@/lib/i18n";
import { useFocusTrap }     from "@/lib/useFocusTrap";

interface ThesisCaptureProps {
  tradeId:  string;
  ticker:   string;
  side:     "BUY" | "SELL";
  shares:   number;
  price:    number;
  onClose:  () => void;
}

const TAG_DEFS = [
  { id: "theme",     labelEn: "🌊 Secular theme",      labelTh: "🌊 ธีมระยะยาว" },
  { id: "moat",      labelEn: "🏰 Moat play",           labelTh: "🏰 Moat แข็งแกร่ง" },
  { id: "valuation", labelEn: "⚖️ Valuation opp.",      labelTh: "⚖️ โอกาสด้านมูลค่า" },
  { id: "catalyst",  labelEn: "⚡ Near-term catalyst",  labelTh: "⚡ Catalyst ใกล้ๆ" },
  { id: "growth",    labelEn: "📈 Growth momentum",     labelTh: "📈 Growth momentum" },
  { id: "technical", labelEn: "📊 Technical setup",     labelTh: "📊 Technical setup" },
  { id: "macro",     labelEn: "🌍 Macro tailwind",      labelTh: "🌍 Macro tailwind" },
  { id: "other",     labelEn: "✦ Other",                labelTh: "✦ อื่นๆ" },
] as const;

type TagId = typeof TAG_DEFS[number]["id"];

export function ThesisCapture({ tradeId, ticker, side, shares, price, onClose }: ThesisCaptureProps) {
  const { lang }  = useI18n();
  const isEn = lang === "en";

  const [thesis,  setThesis]  = useState("");
  const [tags,    setTags]    = useState<TagId[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  function toggleTag(tag: TagId) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 4 ? [...prev, tag] : prev
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/journal/thesis", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tradeId, thesis: thesis.trim(), tags }),
      });
      setSaved(true);
      setTimeout(onClose, 900);
    } catch { /* non-critical — user can add thesis from journal page later */ }
    finally { setSaving(false); }
  }

  const isBuy = side === "BUY";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end lg:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm mx-4 mb-4 lg:mb-0 border-2 border-[#1F1A14] bg-[#faedcd]"
        style={{ boxShadow: "6px 6px 0 #d4a373" }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEn ? "Record your thesis" : "บันทึก thesis"}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1A1A1A]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">
            {isEn ? `Why did you ${isBuy ? "buy" : "sell"} ${ticker}?` : `ทำไมถึง${isBuy ? "ซื้อ" : "ขาย"} ${ticker}?`}
          </span>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xs" aria-label="Close">✕</button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">

          {/* Trade summary */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className="font-bold px-2 py-0.5 text-white"
              style={{ background: isBuy ? "#16A34A" : "#DC2626" }}
            >
              {isBuy ? "BUY" : "SELL"}
            </span>
            <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              {shares} {ticker} @ ${price.toFixed(2)}
            </span>
            <span className="text-[#8A8378]">
              = ${(shares * price).toFixed(2)}
            </span>
          </div>

          {/* Thesis textarea */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] block mb-1">
              {isEn ? "Your thesis (optional, private, up to 2000 chars)" : "Thesis ของคุณ (ไม่บังคับ, ส่วนตัว, ไม่เกิน 2000 ตัว)"}
            </label>
            <textarea
              value={thesis}
              onChange={e => setThesis(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder={isEn
                ? "What's the story here? Why does this fit your investing thesis?"
                : "มีอะไรน่าสนใจ? ทำไมถึงเข้า thesis ของคุณ?"}
              className="w-full px-3 py-2 border border-[#ccd5ae] bg-[#fefae0] text-xs focus:outline-none focus:border-[#1A1A1A] resize-none"
            />
            <p className="text-[8px] text-[#8A8378] text-right">{thesis.length}/2000</p>
          </div>

          {/* Tag chips */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] mb-1.5">
              {isEn ? "Tags (up to 4)" : "Tags (ไม่เกิน 4 อัน)"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_DEFS.map(tag => {
                const selected = tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="text-[9px] font-bold px-2 py-1 border transition-colors"
                    style={{
                      background:  selected ? "#1A1A1A" : "#fefae0",
                      color:       selected ? "#fff"    : "#1A1A1A",
                      borderColor: selected ? "#1A1A1A" : "#ccd5ae",
                    }}
                  >
                    {isEn ? tag.labelEn : tag.labelTh}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          {saved ? (
            <div className="py-2 text-center text-sm font-bold text-[#16A34A]">
              {isEn ? "Saved ✓ — Martin can review this later" : "บันทึกแล้ว ✓ — Martin จะรีวิวให้ภายหลัง"}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-xs font-bold border border-[#ccd5ae] text-[#8A8378] hover:text-[#1A1A1A] transition-colors"
              >
                {isEn ? "Skip — maybe later" : "ข้าม — ไว้ทีหลัง"}
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 transition-colors"
              >
                {saving ? "…" : isEn ? "Save thesis ✓" : "บันทึก thesis ✓"}
              </button>
            </div>
          )}

          <p className="text-[8px] text-[#8A8378] text-center">
            {isEn
              ? "Your thesis is private. Martin uses it only to give you a learning review later."
              : "Thesis ของคุณเป็นความลับ Martin ใช้เพื่อรีวิวการเรียนรู้ให้คุณในภายหลังเท่านั้น"}
          </p>
        </div>
      </div>
    </div>
  );
}
