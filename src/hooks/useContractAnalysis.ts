import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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

/**
 * useContractAnalysis
 *
 * Single Responsibility: Manages the full lifecycle of a single contract analysis —
 * file selection, ingestion, streaming analysis, and result state.
 *
 * AbortController: A ref-tracked AbortController is created for each analysis run.
 * If the component unmounts mid-stream (e.g. navigation), the controller fires
 * .abort() to cancel both in-flight fetch requests and halt stream reading,
 * preventing memory leaks and dangling state updates.
 */
export function useContractAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<FinalReport | null>(null);
  const [logIndex, setLogIndex] = useState(0);
  const [apiCallCount, setApiCallCount] = useState<number>(0);
  const [pipelineStatus, setPipelineStatus] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Ref to track the active AbortController for the current analysis run
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (status === "analyzing") {
      const interval = setInterval(() => {
        setLogIndex((prev) => (prev < 4 ? prev + 1 : prev));
      }, 35000);
      return () => clearInterval(interval);
    } else { setLogIndex(0); }
  }, [status]);

  // Cleanup: abort any in-flight requests when the component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleFileDrop = (e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) setFile(e.target.files[0]); };

  const handleAnalyze = async () => {
    if (!file) return;

    // Check user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login?redirect=true');
      return;
    }

    // Abort any previous in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Create a fresh AbortController for this analysis run
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setStatus("analyzing"); setErrorMessage(""); setReport(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("[Frontend] 📤 Initiating Document Ingestion...");
      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
        signal,
      });
      console.log(`[Frontend] 📥 Ingest Response Status: ${ingestRes.status}`);
      const ingestData = await processResponse(ingestRes);

      console.log(`[Frontend] 🧠 Initiating LangGraph Analysis for DocID: ${ingestData.documentId}...`);
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: ingestData.documentId, filename: file.name }),
        signal,
      });
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
      let buffer = "";

      while (true) {
        // Honor abort signal during the stream read loop
        if (signal.aborted) break;

        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // The last element might be an incomplete JSON string, keep it in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
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
            console.error("Failed to parse buffered stream line:", line);
          }
        }
      }

      // If aborted mid-stream, exit silently without updating UI to error state
      if (signal.aborted) {
        console.log("[Frontend] 🛑 Analysis aborted by client.");
        return;
      }

      if (!finalReportData) {
        throw new Error("Pipeline finished without generating a final report.");
      }

      setReport(finalReportData);
      setStatus("complete");
    } catch (err: any) {
      // DOMException with name "AbortError" is expected on navigation — swallow it
      if (err.name === "AbortError") {
        console.log("[Frontend] 🛑 Fetch aborted (component unmounted or new analysis started).");
        return;
      }
      console.error("[Frontend] ❌ CATASTROPHIC FAILURE:", err);
      setErrorMessage(err.message || "Analysis failed.");
      setStatus("error");
    }
  };

  const reset = () => {
    // Abort any in-flight analysis on reset
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
