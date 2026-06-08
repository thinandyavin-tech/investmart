import type { Persona } from "@/lib/personasData";
import { DESIGN_THEMES, FEATURES } from "@/lib/personasData";

interface PersonaCardProps {
  persona:     Persona;
  isHighlighted?: boolean;
}

function initials(name: string): string {
  return name.split(" ")[0].slice(0, 2);
}

export function PersonaCard({ persona, isHighlighted }: PersonaCardProps) {
  const theme   = DESIGN_THEMES[persona.designVote];
  const feature = FEATURES[persona.featureVote];

  return (
    <div
      className={`bg-white rounded-xl border p-3 flex flex-col gap-2 transition-all ${
        isHighlighted ? "border-green-300 shadow-md ring-1 ring-green-200" : "border-slate-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
          style={{ background: persona.color }}
          aria-hidden="true"
        >
          {initials(persona.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-900 truncate">{persona.name}</div>
          <div className="text-xs text-slate-500">{persona.age} ปี · {persona.role}</div>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 min-h-[2.5rem]">
        {persona.style}
      </p>

      <div className="flex flex-col gap-1">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-xs font-bold w-fit"
          style={{ background: theme.color }}
        >
          🎨 {theme.label}
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold w-fit">
          {feature.icon} {feature.label}
        </span>
      </div>
    </div>
  );
}
