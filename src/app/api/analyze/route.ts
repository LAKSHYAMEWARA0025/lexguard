export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getAnalyzeGraph } from "../../../agents/graph";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, filename } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    console.log(`\n🚀 Starting Analysis Graph for Document: ${documentId}`);
    
    // Trigger the LangGraph execution
    const analyzeGraph = getAnalyzeGraph();

    const stream = await analyzeGraph.stream({ documentId: documentId });
    const encoder = new TextEncoder();
    // Capture the client's abort signal to halt processing on disconnect
    const clientSignal = req.signal;

    const writeStreamError = (controller: ReadableStreamDefaultController, error: any) => {
      const errorMessage = error?.message || "Analysis failed.";
      console.error("LLM Execution Error:", error);
      controller.enqueue(encoder.encode(JSON.stringify({ error: errorMessage }) + '\n'));
      controller.close();
    };

    const readable = new ReadableStream({
      async start(controller) {
        let finalReportJson = null;
        try {
          for await (const chunk of stream) {
            // If the client disconnected, stop iterating immediately
            if (clientSignal.aborted) {
              console.log("[Backend] 🛑 Client disconnected — halting stream.");
              break;
            }

            // Send each LangGraph node's output as it finishes
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
            
            // Extract final report
            if (chunk.advisorNode && chunk.advisorNode.finalReport) {
               finalReportJson = chunk.advisorNode.finalReport;
            } else if (chunk.finalReport) {
               finalReportJson = chunk.finalReport;
            } else if (chunk.error) {
              writeStreamError(controller, new Error(String(chunk.error)));
              return;
            }
          }
          
          // Only persist the report if the client is still connected
          if (finalReportJson && !clientSignal.aborted) {
            supabase.from('reports').insert({
              user_id: user.id,
              filename: filename || 'Unknown Document',
              threat_matrix: finalReportJson
            }).then(({ error }) => {
              if (error) {
                console.error("[Backend Database Error]:", error);
              } else {
                console.log("[Backend] ✅ Successfully saved report to database.");
              }
            });
          }
          
          controller.close();
        } catch (err) {
          // Swallow abort-related errors from the stream iterator
          if (clientSignal.aborted) {
            console.log("[Backend] 🛑 Stream aborted due to client disconnect.");
            controller.close();
            return;
          }
          writeStreamError(controller, err);
        }
      }
    });
    return new Response(readable, { headers: { 'Content-Type': 'application/x-ndjson' } });
  } catch (error: any) {
    console.error("[Backend Route Error]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
