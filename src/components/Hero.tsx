"use client";

import Dropzone from "./Dropzone";
import AnalysisLoader from "./AnalysisLoader";
import SystemConsole from "./SystemConsole";
import ThreatMatrix from "./ThreatMatrix";
import AuthButton from "./AuthButton";
import { Menu } from "lucide-react";

interface HeroProps {
  state: {
    file: File | null;
    status: "idle" | "analyzing" | "complete" | "error";
    errorMessage: string;
    report: any;
    logIndex: number;
    apiCallCount: number;
    pipelineStatus: string;
  };
  actions: {
    handleFileDrop: (e: React.DragEvent) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAnalyze: () => void;
    setStatus: (status: "idle" | "analyzing" | "complete" | "error") => void;
    setFile: (file: File | null) => void;
    setReport: (report: any) => void;
    reset: () => void;
    setErrorMessage: (msg: string) => void;
    setApiCallCount: (count: number) => void;
    setPipelineStatus: (status: string) => void;
  };
  onToggleSidebar: () => void;
}

export default function Hero({ state, actions, onToggleSidebar }: HeroProps) {
  return (
    <div className="flex flex-col w-full h-auto min-h-full gap-8 bg-[#080808] text-neutral-200 min-w-0">
      {/* ── Navbar ── */}
      <nav className="relative z-20 flex-shrink-0 flex items-center justify-between px-6 h-14 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden flex items-center justify-center p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-neutral-400 hover:text-white transition-all hover:bg-white/5 cursor-pointer"
            aria-label="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Logo mark — orange slash */}
          <div className="flex items-center gap-0">
            <span className="text-[#e8530e] font-black text-lg tracking-tighter">VAN</span>
            <span className="text-neutral-500 font-light text-lg tracking-tighter">GUARD</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-white/10" />
          <span className="hidden sm:block text-[10px] text-neutral-600 uppercase tracking-[0.2em]">A group leading the way</span>
        </div>
        <AuthButton />
      </nav>

      {state.status === "error" && state.errorMessage && (
        <div className="mx-6 rounded-xl border border-red-900/50 bg-red-950/60 px-4 py-3 text-left shadow-[0_0_24px_rgba(220,38,38,0.15)]" role="alert">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-red-400">
            Analysis Error
          </div>
          <div className="mt-1 text-sm leading-relaxed text-white">
            {state.errorMessage}
          </div>
        </div>
      )}

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
        <div className="relative z-10 flex flex-col gap-6 md:gap-8 animate-fade-in">
          <SystemConsole report={state.report} file={state.file} onReset={actions.reset} apiCallCount={state.apiCallCount} />
          <ThreatMatrix report={state.report} file={state.file} />
        </div>
      )}
    </div>
  );
}
