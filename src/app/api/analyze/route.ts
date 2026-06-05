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
            if (clientSignal.aborted) {
              console.log("[Backend] 🛑 Client disconnected — halting stream.");
              break;
            }

            // Send each LangGraph node's output as it finishes
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
            
            // Extract final report safely from multiple variations of the node names
            if (chunk.advisorNode && (chunk.advisorNode.finalReport || chunk.advisorNode.advisorReport)) {
               finalReportJson = chunk.advisorNode.finalReport || chunk.advisorNode.advisorReport;
            } else if (chunk.advisor && (chunk.advisor.finalReport || chunk.advisor.advisorReport)) {
               finalReportJson = chunk.advisor.finalReport || chunk.advisor.advisorReport;
            } else if (chunk.finalReport) {
               finalReportJson = chunk.finalReport;
            } else if (chunk.advisorReport) {
               finalReportJson = chunk.advisorReport;
            } else if (chunk.error) {
              writeStreamError(controller, new Error(String(chunk.error)));
              return;
            }
          }
          
          // FIXED: We must strictly AWAIT database interactions before closing the stream controller
          if (finalReportJson) {
            console.log("[Backend] 💾 Saving final report to Supabase...");
            try {
              const { error } = await supabase.from('reports').insert({
                user_id: user.id,
                filename: filename || 'Unknown Document',
                threat_matrix: finalReportJson
              });

              if (error) {
                console.error("[Backend Database Error]:", error);
              } else {
                console.log("[Backend] ✅ Successfully saved report to database.");
              }
            } catch (dbErr) {
              console.error("[Backend Database Exception]:", dbErr);
            }
          } else {
            console.warn("[Backend Warning] Stream ended but no matching finalReportJson layout was found.");
          }
          
          controller.close();
        } catch (err) {
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