import { Skull, Lightbulb } from "lucide-react";
import { AdvisorReportItem, Severity } from "../hooks/useContractAnalysis";

export const sevCfg = (s: Severity) => {
  const m: Record<Severity, { strip: string; dot: string; badge: string; tag: string }> = {
    CRITICAL: { strip: "bg-red-600",    dot: "bg-red-500",    badge: "bg-red-500/10 text-red-400 ring-red-500/20",    tag: "CRITICAL" },
    HIGH:     { strip: "bg-orange-500", dot: "bg-orange-400", badge: "bg-orange-500/10 text-orange-400 ring-orange-500/20", tag: "HIGH" },
    MEDIUM:   { strip: "bg-amber-500",  dot: "bg-amber-400",  badge: "bg-amber-500/10 text-amber-400 ring-amber-500/20",  tag: "MEDIUM" },
    LOW:      { strip: "bg-emerald-500",dot: "bg-emerald-400",badge: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20", tag: "LOW" },
  };
  return m[s] || { strip: "bg-gray-500", dot: "bg-gray-400", badge: "bg-gray-500/10 text-gray-400 ring-gray-500/20", tag: "?" };
};

interface RiskCardProps {
  risk: AdvisorReportItem;
  index: number;
}

export default function RiskCard({ risk, index }: RiskCardProps) {
  const c = sevCfg(risk.severity);

  return (
    <div className="anim-fade-up relative flex rounded-xl overflow-hidden bg-[#0f0f0f] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group" style={{ animationDelay: `${index * 60}ms` }}>
      {/* Left severity strip */}
      <div className={`w-1 flex-shrink-0 ${c.strip}`} />

      <div className="flex-1 p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ${c.badge}`}>
            <div className={`w-1 h-1 rounded-full ${c.dot}`} />
            {c.tag}
          </div>
          <span className="text-[10px] text-neutral-700 font-mono">#{String(index + 1).padStart(2, "0")}</span>
        </div>

        {/* Trap */}
        <p className="text-sm font-semibold text-neutral-100 leading-snug mb-3">{risk.trap}</p>

        {/* Source clause */}
        <div className="mb-3 px-3 py-2.5 rounded-lg bg-black/40 border-l-2 border-white/[0.06]">
          <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Source</p>
          <p className="text-[11px] text-neutral-500 leading-relaxed font-mono">{risk.clause}</p>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="px-3 py-2.5 rounded-lg bg-red-950/15 border border-red-900/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Skull size={10} className="text-red-500/50" />
              <p className="text-[10px] font-semibold text-red-500/50 uppercase tracking-wider">Harsh Reality</p>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">{risk.harshReality}</p>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-[#e8530e]/[0.04] border border-[#e8530e]/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb size={10} className="text-[#e8530e]/60" />
              <p className="text-[10px] font-semibold text-[#e8530e]/50 uppercase tracking-wider">Counter-Measure</p>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">{risk.advice}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
