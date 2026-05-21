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
