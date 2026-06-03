import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";

const FALLBACK_RISKS = [{
  risk: "Analysis Formatting Error",
  verdict: "The agent identified threats but failed to format them correctly. Please run the analysis again.",
}];

const toRawText = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }

        return "";
      })
      .join("");
  }

  return String(content ?? "");
};


export async function redTeam(state: typeof GraphState.State) {
  console.log("[RedTeamNode] Started. Input data:", JSON.stringify({ retrievedChunksCount: state.retrievedChunks?.length || 0 }));

  const { retrievedChunks, documentContext } = state;

  if (!retrievedChunks || retrievedChunks.length === 0) {
    console.warn("[RedTeamNode] No chunks retrieved. Skipping analysis.");
    return { risks: [] };
  }

  console.log(`[RedTeamNode] Inputs - Received ${retrievedChunks.length} retrieved chunks.`);

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
  });

  const contextText = retrievedChunks.map(chunk => chunk.content).join("\n\n---\n\n");

  const prompt = `You are a ruthless, highly aggressive "vulture lawyer" acting as an adversarial AI agent.
Your sole job is to completely destroy this contract. You are not here to be fair. You are here to find every possible exploit, trap, and liability.

You are analyzing a document identified as: ${documentContext || "Standard legal contract"}. Tailor your legal attacks to vulnerabilities common in this type of agreement, BUT you must not ignore universal contract traps. Aggressively flag one-sided termination, forced arbitration, liability shields, sneaky renewals, or blatantly illegal penalties, even if they seem 'standard'.

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
    const response = await withRetry(() => llm.invoke(prompt));
    const rawOutput = toRawText((response as any)?.content);
    const cleanedOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedOutput = JSON.parse(cleanedOutput);
      const risks = Array.isArray(parsedOutput?.risks) ? parsedOutput.risks : (Array.isArray(parsedOutput) ? parsedOutput : []);

      console.log(`[RedTeamNode] Successfully finished. Parsed ${risks.length} risks.`);
      return { risks };
    } catch (parseError: any) {
      console.error("[RedTeamNode] Failed to parse LLM JSON output:", parseError?.message || parseError);
      return { risks: FALLBACK_RISKS };
    }

  } catch (error: any) {
    console.error("[RedTeamNode] CRITICAL ERROR:", error.message || error);
    return { risks: FALLBACK_RISKS };
  }
}
