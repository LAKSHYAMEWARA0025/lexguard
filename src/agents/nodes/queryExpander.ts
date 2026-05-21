import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";

export async function queryExpander(state: typeof GraphState.State) {
  console.log("[QueryExpander] Started. Input data:", JSON.stringify({ documentId: state.documentId, documentContext: state.documentContext }));

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
  });

  const schema = z.object({
    queries: z.array(z.string()).length(12).describe("List of exactly 12 specific legal queries to search the vector database."),
  });

  const structuredLlm = llm.withStructuredOutput(schema, { name: "extract" });

  const { documentContext } = state; // Extract the automated context

  const prompt = `You are a master legal strategist analyzing a document identified as: ${documentContext || 'a standard legal contract'}.
First, internally determine the 4 most critical categories of legal risk for this EXACT type of agreement (e.g., Contractor Agreements need IP Assignment and Misclassification checks; SaaS needs Data Rights and SLAs).
Second, generate exactly 3 highly targeted search queries for EACH of your 4 categories, resulting in exactly 12 queries total.

CRITICAL INSTRUCTION FOR VECTOR SEARCH:
DO NOT write conversational questions (e.g., 'What are the risks of X?').
DO write keyword-dense, specific clause targets (e.g., 'independent contractor non-compete clause', 'perpetual intellectual property assignment', 'termination for convenience notice period', 'indemnification liability cap').

CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON matching the schema. Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.`;

  console.log(`[QueryExpander] Raw Prompt (truncated): ${prompt.substring(0, 500)}`);

  try {
    const response = await withRetry(() => structuredLlm.invoke(prompt));
    console.log("[QueryExpander] Zod validation passed!");
    console.log("[QueryExpander] Successfully finished. Final structured output writing to state:", JSON.stringify(response));

    return {
      queries: response.queries,
    };
  } catch (error: any) {
    console.error("[QueryExpander] CRITICAL ERROR:", error.message || error);
    return { queries: [] };
  }
}
