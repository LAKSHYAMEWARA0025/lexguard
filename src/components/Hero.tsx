"use client";

import { useState, useEffect } from "react";
import {
  Upload, FileText, ChevronRight, CheckCircle2, Loader2,
  ShieldAlert, Skull, Lightbulb, RotateCcw, ShieldCheck,
  FileSearch, Zap, GitMerge, CheckCheck, ArrowRight,
} from "lucide-react";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
interface AdvisorReportItem { severity: Severity; clause: string; trap: string; harshReality: string; advice: string; }
interface FinalReport { advisorReport: AdvisorReportItem[]; overallVerdict: string; }

const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const pipeline = [
  { id: 0, label: "Ingest",     icon: FileSearch,  sub: "Vectorizing document" },
  { id: 1, label: "Strategize", icon: Zap,         sub: "Building attack queries" },
  { id: 2, label: "Red Team",   icon: ShieldAlert, sub: "Extracting buried clauses" },
  { id: 3, label: "Verify",     icon: GitMerge,    sub: "Cross-referencing risks" },
  { id: 4, label: "Finalize",   icon: CheckCheck,  sub: "Compiling verdict" },
];

const sevCfg = (s: Severity) => {
  const m: Record<Severity, { strip: string; dot: string; badge: string; tag: string }> = {
    CRITICAL: { strip: "bg-red-600",    dot: "bg-red-500",    badge: "bg-red-500/10 text-red-400 ring-red-500/20",    tag: "CRITICAL" },
    HIGH:     { strip: "bg-orange-500", dot: "bg-orange-400", badge: "bg-orange-500/10 text-orange-400 ring-orange-500/20", tag: "HIGH" },
    MEDIUM:   { strip: "bg-amber-500",  dot: "bg-amber-400",  badge: "bg-amber-500/10 text-amber-400 ring-amber-500/20",  tag: "MEDIUM" },
    LOW:      { strip: "bg-emerald-500",dot: "bg-emerald-400",badge: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20", tag: "LOW" },
  };
  return m[s] || { strip: "bg-gray-500", dot: "bg-gray-400", badge: "bg-gray-500/10 text-gray-400 ring-gray-500/20", tag: "?" };
};

const countSev = (r: FinalReport) => {
  const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  r.advisorReport.forEach((x) => { if (c[x.severity] !== undefined) c[x.severity]++; });
  return c;
};

export default function Hero() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<FinalReport | null>(null);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    if (status === "analyzing") {
      const interval = setInterval(() => {
        setLogIndex((prev) => (prev < pipeline.length - 1 ? prev + 1 : prev));
      }, 35000);
      return () => clearInterval(interval);
    } else { setLogIndex(0); }
  }, [status]);

  const handleFileDrop = (e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) setFile(e.target.files[0]); };

  const handleAnalyze = async () => {
    if (!file) return;
    setStatus("analyzing"); setErrorMessage(""); setReport(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const ingestRes = await fetch("/api/ingest", { method: "POST", body: formData });
      const ingestData = await ingestRes.json();
      if (!ingestRes.ok) throw new Error(ingestData.error || "Document ingestion failed.");
      const analyzeRes = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: ingestData.documentId }) });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Graph analysis failed.");
      setReport(analyzeData.finalReport); setStatus("complete");
    } catch (err: any) {
      console.error(err); setErrorMessage(err.message || "Analysis failed."); setStatus("error");
    }
  };

  const counts = report ? countSev(report) : null;
  const total = report?.advisorReport?.length ?? 0;

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
      {(status === "idle" || status === "error") && !report && (
        <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden">

          {/* Subtle background grid of fine lines */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(#e8530e 1px, transparent 1px), linear-gradient(90deg, #e8530e 1px, transparent 1px)", backgroundSize: "80px 80px" }}
          />

          {/* Main hero layout — stacked */}
          <div className="relative w-full max-w-xl mx-auto px-6 flex flex-col items-center text-center">

            {/* Top: Typography */}
            <div className="w-full max-w-lg mb-14">
              <div className="anim-fade-up flex items-center justify-center gap-3 mb-8">
                <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#e8530e]/60" />
                <span className="text-[10px] text-[#e8530e]/80 uppercase tracking-[0.3em] font-medium">Adversarial AI Analysis</span>
                <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#e8530e]/60" />
              </div>

              <h1 className="anim-slide-right [animation-delay:150ms] text-5xl md:text-6xl lg:text-7xl font-black tracking-[0.05em] leading-[0.85] mb-8">
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-neutral-100 via-neutral-100 to-neutral-400">VAN</span><span className="text-transparent bg-clip-text bg-gradient-to-b from-[#e8530e] to-[#c44408]">GUARD</span>
              </h1>

              <p className="anim-fade-up [animation-delay:300ms] text-neutral-500 text-sm md:text-base leading-loose max-w-lg mx-auto mb-8 flex flex-col gap-1">
                <span>Upload any legal contract and Vanguard's adversarial AI pipeline will surface hidden traps, one-sided clauses, and liability risks in seconds.</span>
                {/* <span>surfacing hidden liabilities and silent killers.</span> */}
              </p>

              {/* Stats row */}
              <div className="anim-fade-up [animation-delay:450ms] flex items-center justify-center gap-10">
                {[
                  { n: "5", l: "AI Agents" },
                  { n: "3K", l: "Dimensions" },
                  { n: "<3 mins", l: "Analysis" },
                ].map(({ n, l }) => (
                  <div key={l} className="flex flex-col items-center">
                    <span className="text-lg font-bold text-neutral-300">{n}</span>
                    <span className="text-[10px] text-neutral-600 uppercase tracking-widest">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Below: The upload panel */}
            <div className="w-full max-w-sm mt-4 anim-fade-up [animation-delay:600ms]">

              {/* Error */}
              {status === "error" && (
                <div className="mb-4 flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-red-950/40 border-l-2 border-red-500 text-red-400 text-xs">
                  <span className="flex items-center gap-2"><ShieldAlert size={13} />{errorMessage}</span>
                  <button onClick={() => setStatus("idle")} className="text-red-600 hover:text-red-400 transition-colors">✕</button>
                </div>
              )}

              {/* Dropzone card */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="relative group cursor-pointer anim-float"
              >
                {/* Orange left-edge strip */}
                <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-gradient-to-b from-[#e8530e] to-[#e8530e]/20 group-hover:to-[#e8530e] transition-all duration-500" />

                <div className="ml-4 bg-[#0f0f0f] border border-white/[0.06] rounded-xl group-hover:border-[#e8530e]/20 transition-all duration-300 p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-[#e8530e]/10 border border-[#e8530e]/20 flex items-center justify-center mb-4 group-hover:bg-[#e8530e]/15 group-hover:shadow-[0_0_20px_rgba(232,83,14,0.15)] transition-all duration-300">
                      <Upload size={20} className="text-[#e8530e]" />
                    </div>
                    <p className="text-sm font-medium text-neutral-300 mb-1">Drop contract here</p>
                    <p className="text-[11px] text-neutral-600">PDF, DOCX, or TXT</p>
                  </div>
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                </div>
              </div>

              {/* File + CTA */}
              {file && (
                <div className="mt-4 space-y-3 anim-fade-up">
                  <div className="ml-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0f0f0f] border border-white/[0.06]">
                    <FileText size={14} className="text-[#e8530e] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-300 truncate">{file.name}</p>
                      <p className="text-[10px] text-neutral-600">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  </div>

                  <button
                    onClick={handleAnalyze}
                    className="ml-4 w-[calc(100%-16px)] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#e8530e] hover:bg-[#d14a0a] text-white text-sm font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(232,83,14,0.25)] hover:shadow-[0_0_30px_rgba(232,83,14,0.4)] active:scale-[0.98]"
                  >
                    Execute Analysis <ArrowRight size={15} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ STATE 2: ANALYZING ══════════════════════════ */}
      {status === "analyzing" && (
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
      )}

      {/* ══════════════════════════ STATE 3: RESULTS ══════════════════════════ */}
      {status === "complete" && report && (
        <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* ── LEFT SIDEBAR ── */}
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
                { k: "CRITICAL" as Severity, v: counts?.CRITICAL ?? 0, c: "bg-red-500" },
                { k: "HIGH" as Severity,     v: counts?.HIGH ?? 0,     c: "bg-orange-500" },
                { k: "MEDIUM" as Severity,   v: counts?.MEDIUM ?? 0,   c: "bg-amber-500" },
                { k: "LOW" as Severity,      v: counts?.LOW ?? 0,      c: "bg-emerald-500" },
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
              onClick={() => { setStatus("idle"); setFile(null); setReport(null); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-medium text-neutral-600 border border-white/[0.06] hover:border-[#e8530e]/25 hover:text-[#e8530e] hover:bg-[#e8530e]/[0.04] transition-all duration-200"
            >
              <RotateCcw size={12} /> New Analysis
            </button>
          </aside>

          {/* ── RIGHT: RISK CARDS ── */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-3 [&::-webkit-scrollbar]:w-[5px]">

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-5 w-[3px] rounded-full bg-[#e8530e]" />
                <div>
                  <h2 className="text-sm font-bold text-neutral-200 tracking-tight">Threat Matrix</h2>
                  <p className="text-[10px] text-neutral-600">{total} findings · priority sorted</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/15 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={10} /> Complete
              </div>
            </div>

            {report.advisorReport && report.advisorReport.length > 0 ? (
              report.advisorReport
                .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
                .map((risk, i) => {
                  const c = sevCfg(risk.severity);
                  return (
                    <div key={i} className="anim-fade-up relative flex rounded-xl overflow-hidden bg-[#0f0f0f] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group" style={{ animationDelay: `${i * 60}ms` }}>
                      {/* Left severity strip */}
                      <div className={`w-1 flex-shrink-0 ${c.strip}`} />

                      <div className="flex-1 p-5">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ${c.badge}`}>
                            <div className={`w-1 h-1 rounded-full ${c.dot}`} />
                            {c.tag}
                          </div>
                          <span className="text-[10px] text-neutral-700 font-mono">#{String(i + 1).padStart(2, "0")}</span>
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
                })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <ShieldCheck size={22} className="text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-neutral-400 mb-1">No threats detected</p>
                <p className="text-[11px] text-neutral-700">This contract appears clean.</p>
              </div>
            )}
            <div className="h-8" />
          </div>
        </div>
      )}
    </main>
  );
}
