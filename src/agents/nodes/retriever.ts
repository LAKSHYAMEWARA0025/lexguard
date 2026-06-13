import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatGroq } from "@langchain/groq";
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

  // Bulk call stays optimized to 1 single hit for all 12 strings
  console.log(`[RetrieverNode] Generating embeddings for ${queries.length} queries in a single bulk request...`);
  try {
    queryEmbeddings = await withRetry(() => embeddingsModel.embedDocuments(queries));
    console.log(`[RetrieverNode] Successfully generated ${queryEmbeddings.length} embeddings in one pass.`);

    // Debug log: identify which queries returned empty embeddings
    queryEmbeddings.forEach((emb, i) => {
      if (!emb || emb.length === 0) {
        console.warn(`[RetrieverNode] Empty embedding at index ${i} for query: "${queries[i]}"`);
      }
    });

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

  // Filter out any malformed/empty embeddings before hitting Supabase
  const validQueryEmbeddings = queryEmbeddings.filter(
    (embedding) => Array.isArray(embedding) && embedding.length > 0
  );

  if (validQueryEmbeddings.length === 0) {
    console.warn("[RetrieverNode] All embeddings were empty after validation. Exiting early.");
    return { retrievedChunks: [] };
  }

  if (validQueryEmbeddings.length < queryEmbeddings.length) {
    console.warn(
      `[RetrieverNode] Filtered out ${queryEmbeddings.length - validQueryEmbeddings.length} empty embeddings before Supabase RPC.`
    );
  }

  try {
    console.log(`[RetrieverNode] Executing vector search across ${validQueryEmbeddings.length} query embeddings...`);

    // Concurrently map over valid embeddings and execute Supabase RPC
    const searchResults = await Promise.all(
      validQueryEmbeddings.map(async (embedding) => {
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
      console.log(`[RetrieverNode] Retrieved ${finalChunksToKeep.length} chunks. Invoking Groq Reranker with 15s timeout...`);

      const llm = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.1-8b-instant",
        temperature: 0,
        maxRetries: 1,
      });

      const excerptsText = finalChunksToKeep.map((c: any) => `ID: ${c.id}\nContent: ${c.content}`).join("\n\n---\n\n");
      const queriesText = queries.join(", ");

      const prompt = `You are a legal triage agent. Review these document excerpts against our search queries: [${queriesText}]. Filter out standard boilerplate. Return a raw JSON object string with a single key 'keepIds' matching an array of string IDs. Do NOT wrap your output in markdown code fences or conversational text. Prioritize anything related to fees, IP loss, liability shields, or termination traps.
      
      EXCERPTS:
      ${excerptsText}
      
      CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON. Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("RERANKER_TIMEOUT")), 15000)
      );

      try {
        const response: any = await Promise.race([
          withRetry(() => llm.invoke(prompt)),
          timeoutPromise
        ]);

        const rawOutput = response?.content || "";
        const firstOpenBrace = rawOutput.indexOf("{");
        const lastCloseBrace = rawOutput.lastIndexOf("}");
        let cleanedOutput = rawOutput;

        if (firstOpenBrace !== -1 && lastCloseBrace !== -1) {
          cleanedOutput = rawOutput.substring(firstOpenBrace, lastCloseBrace + 1).trim();
        }

        const parsedResponse = JSON.parse(cleanedOutput);

        console.log(`[RetrieverNode] Reranker returned ${parsedResponse?.keepIds?.length || 0} IDs to keep.`);

        if (parsedResponse && parsedResponse.keepIds) {
          const rerankerIds = parsedResponse.keepIds.map(String);
          finalChunksToKeep = finalChunksToKeep.filter((chunk: any) =>
            rerankerIds.includes(String(chunk.id))
          );
        }

        // Enforce a strict fallback slice in case filtering returned anomalous layout
        finalChunksToKeep = finalChunksToKeep.slice(0, 15);

      } catch (err: any) {
        // FALLBACK: If Groq hangs or encounters errors, slice directly and push execution forward
        console.warn("[RetrieverNode] Groq Reranker timed out or failed. Bypassing and using top 15 vector search chunks.", err.message || "");
        finalChunksToKeep = finalChunksToKeep.slice(0, 15);
      }
    }

    console.log(`[RetrieverNode] Successfully finished. Final structured output writing to state: ${finalChunksToKeep.length} unique chunks retrieved.`);

    return { retrievedChunks: finalChunksToKeep };
  } catch (error: any) {
    console.error("[RetrieverNode] CRITICAL ERROR:", error.message || error);
    return { retrievedChunks: [] };
  }
}