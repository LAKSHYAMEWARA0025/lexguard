"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, ChevronRight, CheckCircle2, Circle, Loader2, AlertTriangle, ShieldAlert, Skull, Lightbulb, ChevronDown, ChevronUp, Terminal } from "lucide-react";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface AdvisorReportItem {
  severity: Severity;
  clause: string;
  trap: string;
  harshReality: string;
  advice: string;
}

interface FinalReport {
  advisorReport: AdvisorReportItem[];
  overallVerdict: string;
}

const severityRank = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const getSeverityConfig = (severity: Severity) => {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return { borderClass: "neon-border-red", textClass: "text-red-500", label: severity };
    case "MEDIUM":
      return { borderClass: "neon-border-yellow", textClass: "text-yellow-500", label: severity };
    case "LOW":
      return { borderClass: "neon-border-green", textClass: "text-green-500", label: severity };
    default:
      return { borderClass: "neon-border-blue", textClass: "text-blue-500", label: "UNKNOWN" };
  }
};

const terminalLogs = [
  "[SYSTEM] Initiating file ingestion sequence...",
  "[SYSTEM] Vectorizing text with models/gemini-embedding-001...",
  "[SYSTEM] Committing 3072-dim vectors to pgvector...",
  "[STRATEGIST] Generating adversarial search queries...",
  "[RETRIEVER] Running concurrent semantic similarity searches...",
  "[RED TEAM] Extracting malicious and buried clauses...",
  "[VERIFIER] Cross-referencing identified traps...",
  "[ADVISOR] Synthesizing harsh reality report..."
];

export default function Hero() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<FinalReport | null>(null);
  
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    if (status === "analyzing") {
      const interval = setInterval(() => {
        setLogIndex((prev) => (prev < terminalLogs.length - 1 ? prev + 1 : prev));
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setLogIndex(0);
    }
  }, [status]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStatus("analyzing");
    setErrorMessage("");
    setReport(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const ingestRes = await fetch('/api/ingest', { method: 'POST', body: formData });
      const ingestData = await ingestRes.json();
      if (!ingestRes.ok) throw new Error(ingestData.error || "Document ingestion failed.");
      
      const analyzeRes = await fetch('/api/analyze', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: ingestData.documentId }) 
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Graph analysis failed.");
      
      setReport(analyzeData.finalReport);
      setStatus("complete");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Analysis failed. Check logs and retry.");
      setStatus("error");
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#030303] text-white flex flex-col items-center justify-center p-4 md:p-8">
      {/* Static Hero Image & Grid background */}
      <div className="absolute inset-0 z-0 h-screen w-full overflow-hidden">
        <img 
          src="/lexguard_static_hero.png" 
          alt="Futuristic legal intelligence interface"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      </div>
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none z-0" />

      {/* Idle State - HUD Upload Zone */}
      {(status === "idle" || status === "error") && !report && (
        <div className="w-full flex flex-col items-center justify-center relative z-10">
          
          {/* High-Impact Typography & Copy */}
          <div className="z-10 text-center max-w-3xl mb-12">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-4 heading-font">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-800">LEXGUARD</span> UPLINK
            </h1>
            <p className="text-gray-300 text-sm md:text-base lg:text-lg font-mono">
              Subject your contract to adversarial AI analysis. <br className="hidden md:block"/> Drop a .PDF, .DOCX, or .TXT to initiate threat detection.
            </p>
          </div>

          {status === "error" && (
            <div className="z-10 w-full max-w-xl mb-8 bg-blue-950/50 border border-blue-500 text-blue-400 p-4 rounded flex items-center justify-between font-mono text-sm animate-fade-in-up">
              <span className="flex items-center gap-2"><ShieldAlert size={16} /> [SYSTEM_ERROR]: {errorMessage}</span>
              <button onClick={() => setStatus("idle")} className="hover:text-blue-300">DISMISS</button>
            </div>
          )}

          {/* The Cyber-Scanner Dropzone */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="z-10 w-full max-w-xl aspect-video md:aspect-[21/9] relative group cursor-pointer mx-auto animate-fade-in-up"
          >
            {/* Animated glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-900 rounded-xl blur-md opacity-20 group-hover:opacity-60 transition duration-500"></div>
            
            {/* Main Glass Container */}
            <div className="relative h-full w-full bg-black/60 backdrop-blur-xl border border-blue-500/30 rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all duration-300 group-hover:border-blue-500/80 group-hover:bg-black/80">
              
              {/* Corner Accents (HUD Vibe) */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500 rounded-br-lg"></div>

              {/* Icon & Text */}
              <svg className="w-10 h-10 md:w-16 md:h-16 text-blue-500/50 group-hover:text-blue-500 mb-4 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-mono text-sm md:text-base text-gray-300 group-hover:text-white uppercase tracking-wider">
                CLICK OR DRAG FILE HERE
              </p>
              <p className="font-mono text-xs text-blue-500/70 mt-2 uppercase tracking-widest">SECURE BLUE UPLINK ESTABLISHED</p>
              
              {/* Hidden File Input */}
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
            </div>
          </div>

          {/* Action Area */}
          {file && (
            <div className="z-10 mt-8 flex flex-col items-center animate-fade-in-up">
              <div className="px-4 py-2 bg-blue-950/30 border border-blue-500/50 rounded text-sm text-blue-400 flex items-center gap-2 mb-6 font-mono shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <CheckCircle2 size={16} /> TARGET ACQUIRED: {file.name}
              </div>
              <button 
                onClick={handleAnalyze}
                className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-widest uppercase text-sm rounded flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:scale-105 active:scale-95"
              >
                Execute <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>
          )}

        </div>
      )}

      {/* Analyzing / Complete State - HUD Split Layout */}
      {(status === "analyzing" || status === "complete") && (
        <div className="z-10 w-full max-w-7xl mx-auto h-[85vh] overflow-hidden">
          {/* Results Split View */}
          <div className="flex flex-col md:flex-row h-full w-full overflow-hidden gap-6">

            {/* LEFT: System Console (Fixed/Pinned) */}
            <div className="w-full md:w-1/3 flex flex-col border border-white/10 rounded-xl bg-black/40 backdrop-blur-md p-6 h-full relative overflow-hidden">
              {status === "analyzing" && (
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none animate-scan z-20 border-b border-blue-500/50 shadow-[0_4px_20px_rgba(59,130,246,0.3)]"></div>
              )}
              
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4 z-10">
                <Terminal className="text-blue-500" />
                <h2 className="text-lg font-bold tracking-widest uppercase text-white heading-font">System Console</h2>
              </div>
              
              <div className="flex-grow space-y-3 font-mono text-xs md:text-sm text-blue-400 overflow-y-auto pb-4 z-10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-blue-900/50">
                {terminalLogs.slice(0, logIndex + 1).map((log, i) => (
                  <div key={i} className="animate-fade-in-up flex gap-2">
                    <span className="opacity-50">{">"}</span> {log}
                  </div>
                ))}
                {status === "analyzing" && (
                  <div className="flex gap-2 animate-pulse mt-2">
                    <span className="opacity-50">{">"}</span> <span className="w-2 h-4 bg-blue-500 inline-block"></span>
                  </div>
                )}
                {status === "complete" && (
                  <div className="text-[#22c55e] font-bold mt-4 animate-fade-in-up">
                    {">"} [SYSTEM] Analysis complete. Rendering threat matrix.
                  </div>
                )}
              </div>

              {status === "complete" && (
                <button 
                  onClick={() => { setStatus("idle"); setFile(null); setReport(null); }} 
                  className="w-full mt-auto border border-blue-500/30 hover:bg-blue-500/10 text-blue-500 font-bold text-xs tracking-widest uppercase transition-colors rounded py-3 z-10"
                >
                  ABORT & RESET
                </button>
              )}
            </div>

            {/* RIGHT: Threat Matrix (Scrollable Area) */}
            <div className="w-full md:w-2/3 h-full overflow-y-auto pb-24 pr-4 space-y-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-blue-900/50 [&::-webkit-scrollbar-track]:bg-black/20">

              {/* Overall Verdict Banner */}
              {status === "complete" && report && (
                <div className="p-6 border border-white/10 rounded-xl bg-black/40 backdrop-blur-md animate-fade-in-up">
                  <div className="text-[10px] font-bold tracking-[0.3em] text-white/50 mb-2 uppercase flex items-center gap-2">
                    <AlertTriangle size={12} className="text-blue-500" /> OVERALL VERDICT
                  </div>
                  <p className="text-xl md:text-2xl text-white heading-font">
                    {report.overallVerdict}
                  </p>
                </div>
              )}
              
              {/* Dynamically Styled Risk Cards Map */}
              {status === "complete" && report && (
                <div className="flex flex-col space-y-4">
                  {report.advisorReport && report.advisorReport.length > 0 ? (
                    report.advisorReport
                      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
                      .map((risk, index) => {
                        {/* Get color classes based on risk.severity */}
                        const { borderClass, textClass, label } = getSeverityConfig(risk.severity);

                        return (
                          <div key={index} className={`glass-panel rounded-xl p-5 ${borderClass} transition-all duration-300 animate-fade-in-up hover:bg-black/60`} style={{ animationDelay: `${index * 150}ms` }}>
                            {/* Use textClass for the severity label/icon */}
                            <div className={`flex items-center gap-2 mb-3 ${textClass}`}>
                              <AlertTriangle size={16} /> <span className="font-mono text-xs font-bold tracking-widest">{label} TRAP</span>
                            </div>
                            {/* Trap is stark white monospace */}
                            <p className="font-mono text-white text-xs md:text-sm mb-4 leading-relaxed">{risk.trap}</p>
                            
                            <div className="relative bg-black/60 border border-white/10 rounded p-4 font-mono text-xs text-[#9ca3af] mb-4">
                              <span className="text-white">SOURCE: </span> {risk.clause}
                            </div>
                            
                            <div className="flex flex-col gap-3 font-sans">
                              <div>
                                <div className="flex items-center gap-2 text-[#9ca3af] font-bold text-xs mb-1 uppercase tracking-wider"><Skull size={14}/> Harsh Reality</div>
                                {/* Harsh Reality is muted gray sans-serif */}
                                <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{risk.harshReality}</p>
                              </div>
                              <div className="bg-white/5 border border-white/10 rounded-md p-3 mt-1">
                                <div className="flex items-center gap-2 text-white/70 font-bold text-xs mb-1 uppercase tracking-wider"><Lightbulb size={14}/> Counter-Measure</div>
                                <p className="text-[#f5f5f5] leading-relaxed text-sm">{risk.advice}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="glass-panel p-6 text-blue-400 font-mono text-center neon-border-blue rounded-xl">
                      No critical threats detected. You are clear to proceed.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
