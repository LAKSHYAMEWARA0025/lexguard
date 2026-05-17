import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { GraphState } from '../state';

export async function retrieverNode(state: typeof GraphState.State) {
  console.log("[RetrieverNode] --- NODE ENTRY ---");

  const { documentId, queries } = state;

  // Early exit if required state is missing
  if (!documentId || !queries || queries.length === 0) {
    console.warn("[RetrieverNode] Missing documentId or queries. Exiting early.");
    return { retrievedChunks: [] };
  }
  
  console.log(`[RetrieverNode] Inputs - Document ID: ${documentId}, Queries count: ${queries.length}`);

  // Initialize embeddings model exactly as specified
  const embeddingsModel = new GoogleGenerativeAIEmbeddings({
    model: "models/gemini-embedding-001",
  });

  console.log(`[RetrieverNode] Generating embeddings for ${queries.length} queries concurrently...`);
  
  try {
    // Concurrently map over the queries array to generate vector embeddings
    const queryEmbeddings = await Promise.all(
      queries.map(async (query) => {
        return embeddingsModel.embedQuery(query);
      })
    );

    console.log(`[RetrieverNode] Executing vector search across ${queryEmbeddings.length} query embeddings...`);
    
    // Concurrently map over generated embeddings and execute RPC
    const searchResults = await Promise.all(
      queryEmbeddings.map(async (embedding) => {
        const { data, error } = await supabase.rpc('match_document_chunks', {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: 8,
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

    const deduplicatedArray = Array.from(deduplicatedChunksMap.values());

    console.log(`[RetrieverNode] Final structured output writing to state: ${deduplicatedArray.length} unique chunks retrieved.`);

    // Return the updated state
    return { retrievedChunks: deduplicatedArray };
  } catch (error: any) {
    console.error("[RetrieverNode] Execution failed:", error.message || error);
    return { retrievedChunks: [] };
  }
}
