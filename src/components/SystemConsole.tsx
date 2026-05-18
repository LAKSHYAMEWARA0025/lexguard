import { RotateCcw } from "lucide-react";
import { FinalReport, Severity } from "../hooks/useContractAnalysis";

const countSev = (r: FinalReport) => {
  const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  r.advisorReport.forEach((x) => { if (c[x.severity] !== undefined) c[x.severity]++; });
  return c;
};

interface SystemConsoleProps {
  report: FinalReport;
  file: File | null;
  onReset: () => void;
}

export default function SystemConsole({ report, file, onReset }: SystemConsoleProps) {
  const counts = countSev(report);
  const total = report.advisorReport?.length ?? 0;

  return (
    <aside className="flex-shrink-0 w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#0a0a0a] p-5 flex flex-col gap-5 overflow-y-auto md:overflow-hidden">

      {/* Risk score */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-2xl bg-[#e8530e]/10 border border-[#e8530e]/25 flex items-center justify-center glow-pulse">
          <span className="text-3xl font-black text-[#e8530e]">{total}</span>
        </div>
        <p className="text-[10px] text-neutral-600 uppercase tracking-[0.2em] mt-3">Risks Found</p>
      </div>

      {/* Severity breakdown */}
      <div className="space-y-1.5">
        {[
          { k: "CRITICAL" as Severity, v: counts.CRITICAL ?? 0, c: "bg-red-500" },
          { k: "HIGH" as Severity,     v: counts.HIGH ?? 0,     c: "bg-orange-500" },
          { k: "MEDIUM" as Severity,   v: counts.MEDIUM ?? 0,   c: "bg-amber-500" },
          { k: "LOW" as Severity,      v: counts.LOW ?? 0,      c: "bg-emerald-500" },
        ].map(({ k, v, c }) => (
          <div key={k} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className={`w-1.5 h-1.5 rounded-full ${c}`} />
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider flex-1">{k}</span>
            <span className="text-xs font-bold text-neutral-400">{v}</span>
          </div>
        ))}
      </div>

      {/* File info */}
      <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border-l-2 border-[#e8530e]/30">
        <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Document</p>
        <p className="text-xs text-neutral-400 truncate">{file?.name ?? "Contract"}</p>
      </div>

      {/* Verdict */}
      <div className="px-3 py-2.5 rounded-lg bg-white/[0.02]">
        <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1.5">Verdict</p>
        <p className="text-[11px] text-neutral-500 leading-relaxed">{report.overallVerdict}</p>
      </div>

      <div className="flex-1 hidden md:block" />

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-medium text-neutral-600 border border-white/[0.06] hover:border-[#e8530e]/25 hover:text-[#e8530e] hover:bg-[#e8530e]/[0.04] transition-all duration-200"
      >
        <RotateCcw size={12} /> New Analysis
      </button>
    </aside>
  );
}
