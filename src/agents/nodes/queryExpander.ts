import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";

export async function queryExpander(state: typeof GraphState.State) {
  console.log("[QueryExpander] --- NODE ENTRY ---");
  console.log(`[QueryExpander] Inputs - Document ID: ${state.documentId}`);

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
  });

  const schema = z.object({
    queries: z.array(z.string()).describe("List of 4-5 specific legal queries to search the vector database."),
  });

  const structuredLlm = llm.withStructuredOutput(schema);

  const { documentContext } = state; // Extract the automated context
  
  const prompt = `You are a master legal strategist. 
  You are analyzing the following specific document: "${documentContext || 'a standard legal contract'}".
  Your goal is to find exploitative, harmful, or hidden clauses that are specifically dangerous in this exact type of agreement.
  Instead of doing a generic search, break this goal down into 5 to 7 highly specific search queries targeting the vulnerabilities of this specific contract type.
  Return only the list of queries.`;

  console.log(`[QueryExpander] Raw Prompt (truncated): ${prompt.substring(0, 500)}`);

  try {
    const response = await withRetry(() => structuredLlm.invoke(prompt));
    console.log("[QueryExpander] Zod validation passed!");
    console.log("[QueryExpander] Final structured output writing to state:", JSON.stringify(response));

    return {
      queries: response.queries,
    };
  } catch (error: any) {
    console.error("[QueryExpander] Zod validation or execution failed:", error.message || error);
    return { queries: [] };
  }
}
