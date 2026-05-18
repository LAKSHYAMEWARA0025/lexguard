import { Upload, FileText, CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react";

interface DropzoneProps {
  status: "idle" | "analyzing" | "complete" | "error";
  errorMessage: string;
  file: File | null;
  onDrop: (e: React.DragEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  onDismissError: () => void;
}

export default function Dropzone({
  status,
  errorMessage,
  file,
  onDrop,
  onChange,
  onAnalyze,
  onDismissError,
}: DropzoneProps) {
  return (
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
              <button onClick={onDismissError} className="text-red-600 hover:text-red-400 transition-colors">✕</button>
            </div>
          )}

          {/* Dropzone card */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
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
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.docx,.txt" onChange={onChange} />
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
                onClick={onAnalyze}
                className="ml-4 w-[calc(100%-16px)] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#e8530e] hover:bg-[#d14a0a] text-white text-sm font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(232,83,14,0.25)] hover:shadow-[0_0_30px_rgba(232,83,14,0.4)] active:scale-[0.98]"
              >
                Execute Analysis <ArrowRight size={15} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
