import { Annotation } from "@langchain/langgraph";

export interface AdvisorReportItem {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  clause: string;
  trap: string;
  harshReality: string;
  advice: string;
}

export interface FinalReport {
  advisorReport: AdvisorReportItem[];
  overallVerdict: string;
}

export const GraphState = Annotation.Root({
  documentId: Annotation<string>(),
  documentContext: Annotation<string>({
    reducer: (curr, next) => next,
    default: () => "",
  }),
  queries: Annotation<string[]>({
    reducer: (curr, next) => next, // Overwrite with new queries
    default: () => [],
  }),
  retrievedChunks: Annotation<any[]>({
    reducer: (curr, next) => next, // Overwrite with new chunks
    default: () => [],
  }),
  risks: Annotation<any[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
  finalReport: Annotation<FinalReport | null>({
    reducer: (curr, next) => next,
    default: () => null,
  })
});
