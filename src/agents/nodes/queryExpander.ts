import { ChatGroq } from "@langchain/groq";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";

export async function queryExpander(state: typeof GraphState.State) {
  console.log("[QueryExpander] Started. Input data:", JSON.stringify({ documentId: state.documentId, documentContext: state.documentContext }));

  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY, 
    model: "llama-3.1-8b-instant", 
    temperature: 0,
    maxRetries: 1, 
  });

  const { documentContext } = state; 

  // FIXED: Removed Structured Output dependency and strengthened prompt against lazy copying
  const prompt = `You are a master legal strategist analyzing a document identified as: ${documentContext || 'a standard legal contract'}.
First, internally determine the 4 most critical categories of legal risk for this EXACT type of agreement.
Second, generate exactly 3 highly targeted search queries for EACH of your 4 categories, resulting in exactly 12 queries total.

CRITICAL INSTRUCTION FOR VECTOR SEARCH:
DO NOT write conversational questions (e.g., 'What are the risks of X?').
DO write keyword-dense, specific clause targets. 
DO NOT copy standard corporate examples if they do not apply to this specific document context. Generate targets highly specific to: ${documentContext}.

CRITICAL FORMATTING INSTRUCTION: You must return ONLY a raw, valid JSON object string matching this exact structure:
{
  "queries": ["query1", "query2", "...", "query12"]
}
Start your response exactly with { and end exactly with }. 
Provide absolutely NO conversational text, NO markdown formatting, and NO HTML/XML tags. Just the JSON object.
Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the raw JSON object.`;

  console.log(`[QueryExpander] Raw Prompt (truncated): ${prompt.substring(0, 500)}`);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("QUERY_EXPANDER_TIMEOUT")), 15000)
  );

  try {
    // FIXED: Switched to standard .invoke() to bypass 400 tool_use_failed errors
    const response: any = await Promise.race([
      withRetry(() => llm.invoke(prompt)),
      timeoutPromise
    ]);

    const rawOutput = String(response?.content || "");
    const firstOpenBrace = rawOutput.indexOf("{");
    const lastCloseBrace = rawOutput.lastIndexOf("}");
    
    let cleanedOutput = rawOutput;
    if (firstOpenBrace !== -1 && lastCloseBrace !== -1) {
      cleanedOutput = rawOutput.substring(firstOpenBrace, lastCloseBrace + 1).trim();
    } else {
      throw new Error("No valid JSON boundaries discovered in Query Expander output.");
    }

    const parsed = JSON.parse(cleanedOutput);

    if (!parsed.queries || !Array.isArray(parsed.queries)) {
        throw new Error("Parsed JSON is missing the required 'queries' array.");
    }

    console.log("[QueryExpander] Manual JSON validation passed!");
    console.log("[QueryExpander] Successfully finished. Final structured output writing to state:", JSON.stringify(parsed));

    return {
      queries: parsed.queries.slice(0, 12), // Guarantee exactly up to 12 strings are passed
    };
  } catch (error: any) {
    console.error("[QueryExpander] CRITICAL ERROR:", error.message || error);
    
    if (error.message === "RATE_LIMIT_EXCEEDED") {
      return { status: "error", uiMessage: "We are experiencing high traffic. Please wait a moment and try again." };
    }
    
    if (error.message === "QUERY_EXPANDER_TIMEOUT") {
      return { status: "error", uiMessage: "The analysis engine timed out while generating search vectors. Please try again." };
    }
    
    return { queries: [] };
  }
}