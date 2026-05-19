export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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
    
    const stream = await analyzeGraph.stream({ documentId: documentId });
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Send each LangGraph node's output as it finishes
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });
    return new Response(readable, { headers: { 'Content-Type': 'application/x-ndjson' } });
  } catch (error: any) {
    console.error("[Backend Route Error]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
