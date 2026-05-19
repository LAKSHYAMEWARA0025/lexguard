import { useState, useEffect } from "react";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export interface AdvisorReportItem { severity: Severity; clause: string; trap: string; harshReality: string; advice: string; }
export interface FinalReport { advisorReport: AdvisorReportItem[]; overallVerdict: string; }

const processResponse = async (res: Response) => {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Server returned an error.");
    return data;
  } else {
    // It's a raw server crash (text/html)
    const textError = await res.text();
    throw new Error(`Fatal Server Error: ${textError.slice(0, 150)}...`);
  }
};

export function useContractAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<FinalReport | null>(null);
  const [logIndex, setLogIndex] = useState(0);
  const [apiCallCount, setApiCallCount] = useState<number>(0);
  const [pipelineStatus, setPipelineStatus] = useState("");

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
      
      console.log("[Frontend] 📤 Initiating Document Ingestion...");
      const ingestRes = await fetch("/api/ingest", { method: "POST", body: formData });
      console.log(`[Frontend] 📥 Ingest Response Status: ${ingestRes.status}`);
      const ingestData = await processResponse(ingestRes);
      
      console.log(`[Frontend] 🧠 Initiating LangGraph Analysis for DocID: ${ingestData.documentId}...`);
      const analyzeRes = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: ingestData.documentId }) });
      console.log(`[Frontend] 🏁 Analyze Response Status: ${analyzeRes.status}`);
      
      if (!analyzeRes.ok) {
        const contentType = analyzeRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await analyzeRes.json();
          throw new Error(errData.error || "Server returned an error.");
        } else {
          const textError = await analyzeRes.text();
          throw new Error(`Fatal Server Error: ${textError.slice(0, 150)}...`);
        }
      }
      
      const reader = analyzeRes.body?.getReader();
      if (!reader) throw new Error("No readable stream available.");
      const decoder = new TextDecoder("utf-8");
      
      let finalReportData = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const chunkData = JSON.parse(line);
            
            if (chunkData.classifierNode) setPipelineStatus("Classifying Document...");
            else if (chunkData.queryExpander) setPipelineStatus("Expanding Legal Queries...");
            else if (chunkData.retrieverNode) setPipelineStatus("Retrieving Relevant Clauses...");
            else if (chunkData.redTeam) setPipelineStatus("Running Red Team Attack...");
            else if (chunkData.verifierNode) setPipelineStatus("Verifying Identified Risks...");
            else if (chunkData.advisorNode) {
              setPipelineStatus("Generating Final Report...");
              if (chunkData.advisorNode.finalReport) {
                finalReportData = chunkData.advisorNode.finalReport;
              }
            }
            
            // LangGraph might also return the final state as the last chunk or __end__
            if (chunkData.finalReport) {
               finalReportData = chunkData.finalReport;
            }
          } catch (e) {
            console.error("Failed to parse stream chunk:", line);
          }
        }
      }

      if (!finalReportData) {
         throw new Error("Pipeline finished without generating a final report.");
      }

      setReport(finalReportData);
      setStatus("complete");
    } catch (err: any) {
      console.error("[Frontend] ❌ CATASTROPHIC FAILURE:", err);
      setErrorMessage(err.message || "Analysis failed.");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setFile(null);
    setReport(null);
    setErrorMessage("");
    setApiCallCount(0);
    setPipelineStatus("");
  };

  return {
    state: { file, status, errorMessage, report, logIndex, apiCallCount, pipelineStatus },
    actions: { handleFileDrop, handleFileChange, handleAnalyze, setStatus, setFile, setReport, reset, setErrorMessage, setApiCallCount, setPipelineStatus }
  };
}
