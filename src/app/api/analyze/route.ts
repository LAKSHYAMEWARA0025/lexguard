import { NextRequest, NextResponse } from "next/server";
import { analyzeGraph } from "../../../agents/graph";

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    console.log(`\n🚀 Starting Analysis Graph for Document: ${documentId}`);
    
    // Trigger the LangGraph execution
    const finalState = await analyzeGraph.invoke({
      documentId: documentId,
      // The other state variables will initialize with their defaults
    });

    console.log("✅ Graph Execution Complete!");
    
    // At the end of the analyze route, before returning the response
    if (!finalState.finalReport || !finalState.finalReport.advisorReport || finalState.finalReport.advisorReport.length === 0) {
      // If the final report is completely empty, it means the pipeline failed or timed out.
      return NextResponse.json(
        { error: "AI Engine Rate Limit Exceeded. The system is currently overloaded. Please try again in 60 seconds." }, 
        { status: 429 }
      );
    }

    return NextResponse.json({ success: true, finalReport: finalState.finalReport });
  } catch (error: any) {
    console.error("Graph Execution Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
