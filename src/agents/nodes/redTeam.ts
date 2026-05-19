import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function redTeam(state: typeof GraphState.State) {
  console.log("[RedTeamNode] Started. Input data:", JSON.stringify({ retrievedChunksCount: state.retrievedChunks?.length || 0 }));

  const { retrievedChunks } = state;

  if (!retrievedChunks || retrievedChunks.length === 0) {
    console.warn("[RedTeamNode] No chunks retrieved. Skipping analysis.");
    return { risks: [] };
  }

  console.log(`[RedTeamNode] Inputs - Received ${retrievedChunks.length} retrieved chunks.`);

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest",
    temperature: 0,
  });

  const schema = z.object({
    risks: z.array(z.object({
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).describe("The severity level of the identified risk."),
      clause: z.string().describe("The exact offending text snippet from the document."),
      issue: z.string().describe("Plain-English explanation of the problem, trap, or vulnerability."),
      recommendation: z.string().describe("What to demand, negotiate, or change instead.")
    })).describe("List of identified risks, liabilities, and traps in the contract.")
  });

  const structuredLlm = llm.withStructuredOutput(schema, { name: "extract" });

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

CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON matching the schema. Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.
`;

  console.log(`[RedTeamNode] Raw Prompt (truncated): ${prompt.substring(0, 500)}...`);

  try {
    await sleep(3000); // Throttle to prevent Groq TPM burst limits
    const response = await withRetry(() => structuredLlm.invoke(prompt));
    console.log("[RedTeamNode] Zod validation passed!");
    console.log(`[RedTeamNode] Successfully finished. Final structured output writing to state: ${response?.risks?.length || 0} risks identified.`);

    return {
      risks: response?.risks || [],
    };
  } catch (error: any) {
    console.error("[RedTeamNode] CRITICAL ERROR:", error.message || error);
    return { risks: [] };
  }
}
