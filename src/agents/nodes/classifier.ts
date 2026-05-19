import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { GraphState } from "../state";
import { createClient } from "@supabase/supabase-js";
import { withRetry } from "../../lib/withRetry";

let supabaseClient: any = null;
const getSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
  }
  return supabaseClient;
};

export async function classifierNode(state: typeof GraphState.State) {
  console.log("[ClassifierNode] Started. Input data:", JSON.stringify({ documentId: state.documentId }));
  const { documentId } = state;

  // Fetch the first chunk of the document to get the preamble/title
  const supabase = getSupabase();
  const { data: firstChunk, error } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('document_id', documentId)
    .order('id', { ascending: true }) // Ensures we get the beginning of the doc
    .limit(1);

  if (error || !firstChunk || firstChunk.length === 0) {
    console.warn("[ClassifierNode] Could not fetch first chunk. Defaulting context.");
    return { documentContext: "Standard legal contract." };
  }

  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant",
    temperature: 0,
  });

  const schema = z.object({
    context: z.string().describe("A single, precise sentence describing the exact type of contract and the parties involved.")
  });

  const structuredLlm = llm.withStructuredOutput(schema, { name: "extract" });
  const prompt = `Analyze the following introductory text from a legal document. 
  Determine exactly what type of contract this is and who the primary parties are.
  
  Document Intro:
  "${firstChunk[0].content}"
  
  CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON matching the schema. Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.`;

  try {
    const response = await withRetry(() => structuredLlm.invoke(prompt));
    console.log(`[ClassifierNode] Successfully finished. Extracted Context: ${response.context}`);
    return { documentContext: response.context };
  } catch (err: any) {
    console.error("[ClassifierNode] CRITICAL ERROR:", err.message || err);
    return { documentContext: "Standard legal contract." };
  }
}
