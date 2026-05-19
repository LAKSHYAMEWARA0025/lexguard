export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getAnalyzeGraph } from "../../../agents/graph";

// export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    console.log(`\n🚀 Starting Analysis Graph for Document: ${documentId}`);
    
    // Trigger the LangGraph execution
    const analyzeGraph = getAnalyzeGraph();
    let exactApiCallCount = 0;
    const callTracker = {
      handleLLMStart: async () => { exactApiCallCount++; },
      handleChatModelStart: async () => { exactApiCallCount++; },
    };

    let finalState: any;
    const timeoutWatchdog = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Graph execution timed out (45s)")), 45000)
    );

    try {
      finalState = await Promise.race([
        analyzeGraph.invoke(
          { documentId: documentId },
          { callbacks: [callTracker] }
        ),
        timeoutWatchdog
      ]);
    } catch (graphError: any) {
      console.error("LangGraph Execution Failed:", graphError);
      return NextResponse.json({ error: graphError.message || "LangGraph execution failed." }, { status: 500 });
    }

    console.log("✅ Graph Execution Complete!");
    
    // At the end of the analyze route, before returning the response
    if (!finalState.finalReport || !finalState.finalReport.advisorReport || finalState.finalReport.advisorReport.length === 0) {
      // If the final report is completely empty, it means the pipeline failed or timed out.
      return NextResponse.json(
        { error: "AI Engine Rate Limit Exceeded. The system is currently overloaded. Please try again in 60 seconds." }, 
        { status: 429 }
      );
    }

    return NextResponse.json({ success: true, finalReport: finalState.finalReport, apiCallCount: exactApiCallCount });
  } catch (error: any) {
    console.error("[Backend Route Error]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
