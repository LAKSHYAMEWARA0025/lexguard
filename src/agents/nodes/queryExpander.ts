import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { GraphState } from "../state";

export async function queryExpander(state: typeof GraphState.State) {
  console.log("--- NODE: QUERY EXPANDER ---");

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
  });

  const schema = z.object({
    queries: z.array(z.string()).describe("List of 4-5 specific legal queries to search the vector database."),
  });

  const structuredLlm = llm.withStructuredOutput(schema);

  const prompt = `You are a master legal strategist. Your goal is to find exploitative, harmful, or hidden clauses in a legal contract.
  Instead of doing a generic search, break this goal down into 4 to 5 highly specific search queries.
  Examples: "Find liability waivers", "Find forced arbitration clauses", "Find auto-renewal terms", "Find data sharing policies", "Find liquid damage or training bonds".
  Return only the list of queries.`;

  const response = await structuredLlm.invoke(prompt);
  
  console.log("Generated Queries:", response.queries);

  return {
    queries: response.queries,
  };
}
