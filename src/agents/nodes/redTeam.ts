import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

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
    model: "gemini-2.5-flash", // Kept exactly as you verified
    temperature: 0,
    maxRetries: 1, // FIXED: Stops internal LangChain infinite retries on network fail
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      }
    ]
  });

  const contextText = retrievedChunks
    .map(chunk => chunk.text || chunk.pageContent || chunk.content || JSON.stringify(chunk))
    .join("\n\n---\n\n");

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

CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON matching this exact schema:
{
  "risks": [
    {
      "severity": "CRITICAL",
      "clause": "The exact quoted text from the contract",
      "issue": "Your ruthless explanation of the trap"
    }
  ]
}
Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.
`;

  console.log(`[RedTeamNode] Raw Prompt (truncated): ${prompt.substring(0, 500)}...`);

  // FIXED: 90-second hard timeout. Gives the LLM plenty of time to write a huge JSON array, but saves Vercel from a 300s freeze.
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("RED_TEAM_TIMEOUT")), 90000)
  );

  try {
    const response = await Promise.race([
      withRetry(() => llm.invoke(prompt)),
      timeoutPromise
    ]);
    
    const rawOutput = toRawText((response as any)?.content);

    const cleanedOutput = rawOutput
  .replace(/json\s*/gi, "")
  .replace(/\s*/gi, "")
  .trim();

    const parsed = JSON.parse(cleanedOutput);
    const risks = parsed?.risks ?? FALLBACK_RISKS;

    console.log(`[RedTeamNode] Successfully parsed ${risks.length} risks.`);
    return { risks };
  } catch (error: any) {
    console.error("[RedTeamNode] Failed to parse response or timed out:", error);
    
    if (error.message === "RATE_LIMIT_EXCEEDED") {
      return { status: "error", uiMessage: "We are experiencing high traffic. Please wait a moment and try again." };
    }
    if (error.message === "RED_TEAM_TIMEOUT") {
      return { status: "error", uiMessage: "The adversarial analysis timed out while processing complex threats. Please try again." };
    }
    
    return { risks: FALLBACK_RISKS };
  }
}