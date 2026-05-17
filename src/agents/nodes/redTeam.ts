import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";

export async function redTeam(state: typeof GraphState.State) {
  console.log("[RedTeamNode] --- NODE ENTRY ---");

  const { retrievedChunks } = state;

  if (!retrievedChunks || retrievedChunks.length === 0) {
    console.warn("[RedTeamNode] No chunks retrieved. Skipping analysis.");
    return { risks: [] };
  }
  
  console.log(`[RedTeamNode] Inputs - Received ${retrievedChunks.length} retrieved chunks.`);

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0, // Deterministic, focused output
  });

  const schema = z.object({
    risks: z.array(z.object({
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).describe("The severity level of the identified risk."),
      clause: z.string().describe("The exact offending text snippet from the document."),
      issue: z.string().describe("Plain-English explanation of the problem, trap, or vulnerability."),
      recommendation: z.string().describe("What to demand, negotiate, or change instead.")
    })).describe("List of identified risks, liabilities, and traps in the contract.")
  });

  const structuredLlm = llm.withStructuredOutput(schema);

  const contextText = retrievedChunks.map(chunk => chunk.content).join("\n\n---\n\n");

  const prompt = `You are a ruthless, highly aggressive "vulture lawyer" acting as an adversarial AI agent.
Your sole job is to completely destroy this contract. You are not here to be fair. You are here to find every possible exploit, trap, and liability.

Carefully analyze the following contract excerpts and aggressively flag:
1. Hidden fees or automatic renewal traps.
2. One-sided termination clauses (where only the other party can exit cleanly).
3. Vague or undefined terms that could be interpreted against the user.
4. Liability caps or indemnification clauses that expose the user.
5. Jurisdiction or governing law clauses that severely disadvantage the user.
6. Missing standard protections (what is conspicuously absent that should protect the user).
7. Any language that silently shifts risk onto the signing party.

Do not be polite. Be precise and merciless. Return only the structured JSON of the risks.

CONTRACT EXCERPTS:
${contextText}
`;

  console.log(`[RedTeamNode] Raw Prompt (truncated): ${prompt.substring(0, 500)}...`);

  try {
    const response = await withRetry(() => structuredLlm.invoke(prompt));
    console.log("[RedTeamNode] Zod validation passed!");
    console.log(`[RedTeamNode] Final structured output writing to state: ${response?.risks?.length || 0} risks identified.`);

    return {
      risks: response?.risks || [],
    };
  } catch (error: any) {
    console.error("[RedTeamNode] Zod validation or execution failed:", error.message || error);
    return { risks: [] };
  }
}
