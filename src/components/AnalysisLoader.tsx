import { FileSearch, Zap, ShieldAlert, GitMerge, CheckCheck, CheckCircle2 } from "lucide-react";

export const pipeline = [
  { id: 0, label: "Ingest",     icon: FileSearch,  sub: "Vectorizing document" },
  { id: 1, label: "Strategize", icon: Zap,         sub: "Building attack queries" },
  { id: 2, label: "Red Team",   icon: ShieldAlert, sub: "Extracting buried clauses" },
  { id: 3, label: "Verify",     icon: GitMerge,    sub: "Cross-referencing risks" },
  { id: 4, label: "Finalize",   icon: CheckCheck,  sub: "Compiling verdict" },
];

interface AnalysisLoaderProps {
  logIndex: number;
}

export default function AnalysisLoader({ logIndex }: AnalysisLoaderProps) {
  return (
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl">

        <div className="text-center mb-12">
          <h2 className="text-2xl font-black tracking-tight text-neutral-100 mb-1">
            Tearing it apart<span className="text-[#e8530e]">.</span>
          </h2>
          <p className="text-xs text-neutral-600">Multi-agent pipeline in progress · ~3 minutes</p>
        </div>

        {/* Horizontal pipeline */}
        <div className="flex items-start justify-between gap-2">
          {pipeline.map((step, i) => {
            const done = i < logIndex;
            const active = i === logIndex;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex-1 flex flex-col items-center text-center gap-2">
                {/* Node */}
                <div className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500 ${
                  done  ? "bg-[#e8530e]/15 border border-[#e8530e]/30" :
                  active ? "bg-[#e8530e]/10 border border-[#e8530e]/40 shadow-[0_0_16px_rgba(232,83,14,0.25)]" :
                           "bg-white/[0.03] border border-white/[0.06]"
                }`}>
                  {done ? (
                    <CheckCircle2 size={16} className="text-[#e8530e]" />
                  ) : active ? (
                    <Icon size={16} className="text-[#e8530e] animate-pulse" />
                  ) : (
                    <Icon size={16} className="text-neutral-700" />
                  )}
                </div>
                {/* Label */}
                <p className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  done ? "text-[#e8530e]/60" : active ? "text-[#e8530e]" : "text-neutral-700"
                }`}>{step.label}</p>
                {active && <p className="text-[10px] text-neutral-600 -mt-1">{step.sub}</p>}
              </div>
            );
          })}
        </div>

        {/* Burn progress bar */}
        <div className="mt-10 w-full h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e8530e] to-[#ff6b35] transition-all duration-[2000ms] ease-out"
            style={{ width: `${((logIndex + 1) / pipeline.length) * 100}%` }}
          />
        </div>

        {/* Skeleton */}
        <div className="mt-10 space-y-2.5 opacity-15">
          <div className="h-2 rounded bg-[#e8530e]/30 w-3/4 animate-pulse" />
          <div className="h-2 rounded bg-[#e8530e]/20 w-1/2 animate-pulse [animation-delay:200ms]" />
          <div className="h-2 rounded bg-[#e8530e]/15 w-5/6 animate-pulse [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
}
