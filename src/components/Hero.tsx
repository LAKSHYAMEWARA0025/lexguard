"use client";

import { useContractAnalysis } from "../hooks/useContractAnalysis";
import Dropzone from "./Dropzone";
import AnalysisLoader from "./AnalysisLoader";
import SystemConsole from "./SystemConsole";
import ThreatMatrix from "./ThreatMatrix";

export default function Hero() {
  const { state, actions } = useContractAnalysis();

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-[#080808] text-neutral-200 flex flex-col">
      {/* ── Navbar ── */}
      <nav className="relative z-20 flex-shrink-0 flex items-center justify-between px-6 h-14 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Logo mark — orange slash */}
          <div className="flex items-center gap-0">
            <span className="text-[#e8530e] font-black text-lg tracking-tighter">VAN</span>
            <span className="text-neutral-500 font-light text-lg tracking-tighter">GUARD</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-white/10" />
          <span className="hidden sm:block text-[10px] text-neutral-600 uppercase tracking-[0.2em]">A group leading the way</span>
        </div>
      </nav>

      {/* ══════════════════════════ STATE 1: IDLE ══════════════════════════ */}
      {(state.status === "idle" || state.status === "error") && !state.report && (
        <Dropzone
          status={state.status}
          errorMessage={state.errorMessage}
          file={state.file}
          onDrop={actions.handleFileDrop}
          onChange={actions.handleFileChange}
          onAnalyze={actions.handleAnalyze}
          onDismissError={() => actions.setStatus("idle")}
        />
      )}

      {/* ══════════════════════════ STATE 2: ANALYZING ══════════════════════════ */}
      {state.status === "analyzing" && (
        <AnalysisLoader logIndex={state.logIndex} />
      )}

      {/* ══════════════════════════ STATE 3: RESULTS ══════════════════════════ */}
      {state.status === "complete" && state.report && (
        <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
          <SystemConsole report={state.report} file={state.file} onReset={actions.reset} />
          <ThreatMatrix report={state.report} />
        </div>
      )}
    </main>
  );
}
