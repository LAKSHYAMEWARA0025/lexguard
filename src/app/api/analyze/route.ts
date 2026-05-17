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
    
    return NextResponse.json({ success: true, queries: finalState.queries });
  } catch (error: any) {
    console.error("Graph Execution Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
