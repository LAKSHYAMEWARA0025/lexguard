import { CheckCircle2, ShieldCheck, Download } from "lucide-react";
import { FinalReport } from "../hooks/useContractAnalysis";
import RiskCard from "./RiskCard";
import { downloadReportAsPDF } from "../lib/exportPdf";
import { useState } from "react";

const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

interface ThreatMatrixProps {
  report: FinalReport;
}

export default function ThreatMatrix({ report }: ThreatMatrixProps) {
  const total = report.advisorReport?.length ?? 0;
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    await downloadReportAsPDF("lexguard-report-container");
    setIsDownloading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-3 [&::-webkit-scrollbar]:w-[5px]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-5 w-[3px] rounded-full bg-[#e8530e]" />
          <div>
            <h2 className="text-sm font-bold text-neutral-200 tracking-tight">Threat Matrix</h2>
            <p className="text-[10px] text-neutral-600">{total} findings · priority sorted</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 text-[10px] text-white bg-[#e8530e] hover:bg-[#ff6a22] disabled:opacity-50 transition-colors px-3 py-1.5 rounded-full"
          >
            <Download size={10} />
            {isDownloading ? "Generating PDF..." : "Download PDF Report"}
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/15 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={10} /> Complete
          </div>
        </div>
      </div>

      <div id="lexguard-report-container">
        {report.advisorReport && report.advisorReport.length > 0 ? (
          report.advisorReport
            .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
            .map((risk, i) => <RiskCard key={i} risk={risk} index={i} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <ShieldCheck size={22} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-neutral-400 mb-1">No threats detected</p>
            <p className="text-[11px] text-neutral-700">This contract appears clean.</p>
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
