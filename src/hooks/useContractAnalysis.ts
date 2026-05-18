import { useState, useEffect } from "react";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export interface AdvisorReportItem { severity: Severity; clause: string; trap: string; harshReality: string; advice: string; }
export interface FinalReport { advisorReport: AdvisorReportItem[]; overallVerdict: string; }

export function useContractAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<FinalReport | null>(null);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    if (status === "analyzing") {
      const interval = setInterval(() => {
        setLogIndex((prev) => (prev < 4 ? prev + 1 : prev));
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

  const reset = () => {
    setStatus("idle");
    setFile(null);
    setReport(null);
    setErrorMessage("");
  };

  return {
    state: { file, status, errorMessage, report, logIndex },
    actions: { handleFileDrop, handleFileChange, handleAnalyze, setStatus, setFile, setReport, reset, setErrorMessage }
  };
}
