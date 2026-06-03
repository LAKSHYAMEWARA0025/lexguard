import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GraphState } from '../state';
import { z } from "zod";

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

  const EMBEDDING_BATCH_SIZE = 3;
  const EMBEDDING_TIMEOUT_MS = 5000;
  const EMBEDDING_DELAY_MS = 200;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const embedWithTimeout = async (query: string, index: number) => {
    const embeddingPromise = embeddingsModel.embedQuery(query);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Embedding request timed out after ${EMBEDDING_TIMEOUT_MS}ms for query #${index + 1}`));
      }, EMBEDDING_TIMEOUT_MS);
    });

    return Promise.race([embeddingPromise, timeoutPromise]) as Promise<number[]>;
  };

  console.log(`[RetrieverNode] Generating embeddings for ${queries.length} queries in batches of ${EMBEDDING_BATCH_SIZE}...`);
  
  try {
    const queryEmbeddings: number[][] = [];

    for (let batchStart = 0; batchStart < queries.length; batchStart += EMBEDDING_BATCH_SIZE) {
      const batch = queries.slice(batchStart, batchStart + EMBEDDING_BATCH_SIZE);
      const batchIndex = Math.floor(batchStart / EMBEDDING_BATCH_SIZE) + 1;
      console.log(`[RetrieverNode] Starting embedding batch ${batchIndex} with ${batch.length} queries.`);

      const batchResults = await Promise.allSettled(
        batch.map(async (query, indexInBatch) => {
          const queryIndex = batchStart + indexInBatch;
          const embedding = await embedWithTimeout(query, queryIndex);
          await sleep(EMBEDDING_DELAY_MS);
          return embedding;
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          queryEmbeddings.push(result.value);
        } else {
          console.error("[RetrieverNode] Embedding generation failed:", result.reason?.message || result.reason);
        }
      }

      console.log(`[RetrieverNode] Finished embedding batch ${batchIndex}. Successful embeddings so far: ${queryEmbeddings.length}`);
    }

    if (queryEmbeddings.length === 0) {
      console.warn("[RetrieverNode] No embeddings were generated successfully. Exiting early.");
      return { retrievedChunks: [] };
    }

    console.log(`[RetrieverNode] Executing vector search across ${queryEmbeddings.length} query embeddings...`);
    
    // Concurrently map over generated embeddings and execute RPC
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

    let finalArray = Array.from(deduplicatedChunksMap.values());

    if (finalArray.length > 15) {
      console.log(`[RetrieverNode] Retrieved ${finalArray.length} chunks. Invoking Reranker...`);
      
      const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0,
      });

      const schema = z.object({
        keepIds: z.array(z.string()).describe("Array of string IDs of the chunks to keep."),
      });
      
      const structuredLlm = llm.withStructuredOutput(schema, { name: "rerank" });
      
      const excerptsText = finalArray.map((c: any) => `ID: ${c.id}\nContent: ${c.content}`).join("\n\n---\n\n");
      const queriesText = queries.join(", ");
      
      const prompt = `You are a legal triage agent. Review these document excerpts against our search queries: [${queriesText}]. Filter out standard boilerplate. Return a JSON array containing ONLY the IDs of the top 15 most potentially dangerous, exploitative, or asymmetric chunks. Prioritize anything related to fees, IP loss, liability shields, or termination traps.
      
      EXCERPTS:
      ${excerptsText}
      
      CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON matching the schema. Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.`;
      
      try {
        const response = await structuredLlm.invoke(prompt);
        console.log(`[RetrieverNode] Reranker returned ${response?.keepIds?.length || 0} IDs to keep.`);
        if (response && response.keepIds) {
          const keepSet = new Set(response.keepIds.map(String));
          finalArray = finalArray.filter((c: any) => keepSet.has(String(c.id)));
        }
      } catch (err: any) {
        console.error("[RetrieverNode] Reranker failed, falling back to all retrieved chunks.", err.message || err);
      }
    }

    console.log(`[RetrieverNode] Successfully finished. Final structured output writing to state: ${finalArray.length} unique chunks retrieved.`);

    // Return the updated state
    return { retrievedChunks: finalArray };
  } catch (error: any) {
    console.error("[RetrieverNode] CRITICAL ERROR:", error.message || error);
    return { retrievedChunks: [] };
  }
}
