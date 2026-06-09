import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GraphState } from '../state';
import { z } from "zod";
import { withRetry } from "../../lib/withRetry";

export async function retrieverNode(state: typeof GraphState.State) {
  console.log("[RetrieverNode] Started. Input data:", JSON.stringify({ documentId: state.documentId, queriesCount: state.queries?.length || 0 }));

  const { documentId, queries } = state;

  // Early exit if required state is missing
  if (!documentId || !queries || queries.length === 0) {
    console.warn("[RetrieverNode] Missing documentId or queries. Exiting early.");
    return { retrievedChunks: [] };
  }
  
  console.log(`[RetrieverNode] Inputs - Document ID: ${documentId}, Queries count: ${queries.length}`);

  const embeddingsModel = new GoogleGenerativeAIEmbeddings({
    model: "models/gemini-embedding-001",
    apiKey: process.env.GOOGLE_API_KEY,
  });

  let queryEmbeddings: number[][] = [];

  // OPTIMIZATION: Reduced 12 individual API calls down to exactly 1 bulk call.
  console.log(`[RetrieverNode] Generating embeddings for ${queries.length} queries in a single bulk request...`);
  try {
    queryEmbeddings = await withRetry(() => embeddingsModel.embedDocuments(queries));
    console.log(`[RetrieverNode] Successfully generated ${queryEmbeddings.length} embeddings in one pass.`);
  } catch (embedError: any) {
    console.error("[RetrieverNode] CRITICAL ERROR: Bulk embedding generation failed:", embedError.message || embedError);
    if (embedError.message === "RATE_LIMIT_EXCEEDED") {
      return { status: "error", uiMessage: "We are experiencing high traffic. Please wait a moment and try again." };
    }
    return { retrievedChunks: [] };
  }

  if (!queryEmbeddings || queryEmbeddings.length === 0) {
    console.warn("[RetrieverNode] No embeddings were returned. Exiting early.");
    return { retrievedChunks: [] };
  }

  try {
    console.log(`[RetrieverNode] Executing vector search across ${queryEmbeddings.length} query embeddings...`);
    
    // Concurrently map over generated embeddings and execute Supabase RPC
    const searchResults = await Promise.all(
      queryEmbeddings.map(async (embedding) => {
        const { data, error } = await supabase.rpc('match_document_chunks', {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: 5,
          filter_document_id: documentId,
        });

        if (error) {
          console.error("[RetrieverNode] Supabase RPC Error:", error);
          return [];
        }

        return data || [];
      })
    );

    // Flatten the returned chunk arrays
    const allChunks = searchResults.flat();

    // Deduplicate them using a Map keyed by chunk id
    const deduplicatedChunksMap = new Map();
    allChunks.forEach(chunk => {
      if (!deduplicatedChunksMap.has(chunk.id)) {
        deduplicatedChunksMap.set(chunk.id, chunk);
      }
    });

    let finalChunksToKeep = Array.from(deduplicatedChunksMap.values());

    if (finalChunksToKeep.length > 15) {
      console.log(`[RetrieverNode] Retrieved ${finalChunksToKeep.length} chunks. Invoking Reranker with 15s timeout...`);
      
      const llm = new ChatGoogleGenerativeAI({
        model: "gemini-1.5-flash", // Standardized to match pipeline
        temperature: 0,
        maxRetries: 1, // Prevent infinite internal SDK loops
      });

      const schema = z.object({
        keepIds: z.array(z.string()).describe("Array of string IDs of the chunks to keep."),
      });
      
      const structuredLlm = llm.withStructuredOutput(schema, { name: "rerank" });
      
      const excerptsText = finalChunksToKeep.map((c: any) => `ID: ${c.id}\nContent: ${c.content}`).join("\n\n---\n\n");
      const queriesText = queries.join(", ");
      
      const prompt = `You are a legal triage agent. Review these document excerpts against our search queries: [${queriesText}]. Filter out standard boilerplate. Return a JSON array containing ONLY the IDs of the top 15 most potentially dangerous, exploitative, or asymmetric chunks. Prioritize anything related to fees, IP loss, liability shields, or termination traps.
      
      EXCERPTS:
      ${excerptsText}
      
      CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON matching the schema. Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.`;
      
      // FIXED: 15-second hard timeout for the Reranker to prevent pipeline freezing
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("RERANKER_TIMEOUT")), 15000)
      );

      try {
        const response = await Promise.race([
          withRetry(() => structuredLlm.invoke(prompt)),
          timeoutPromise
        ]) as z.infer<typeof schema>;

        console.log(`[RetrieverNode] Reranker returned ${response?.keepIds?.length || 0} IDs to keep.`);
        
        if (response && response.keepIds) {
          const rerankerIds = response.keepIds.map(String); // ensure string matching
          finalChunksToKeep = finalChunksToKeep.filter((chunk: any) => 
            rerankerIds.includes(String(chunk.id))
          );
        }
        
        // Enforce a hard cap even if the LLM hallucinated more IDs
        finalChunksToKeep = finalChunksToKeep.slice(0, 15);
        
      } catch (err: any) {
        // FALLBACK: If the LLM times out or fails, bypass cleanly and take the top 15 chunks
        console.warn("[RetrieverNode] Reranker timed out or failed. Bypassing and using top 15 vector search chunks.", err.message || "");
        finalChunksToKeep = finalChunksToKeep.slice(0, 15);
      }
    }

    console.log(`[RetrieverNode] Successfully finished. Final structured output writing to state: ${finalChunksToKeep.length} unique chunks retrieved.`);

    // Return the updated state
    return { retrievedChunks: finalChunksToKeep };
  } catch (error: any) {
    console.error("[RetrieverNode] CRITICAL ERROR:", error.message || error);
    return { retrievedChunks: [] };
  }
}