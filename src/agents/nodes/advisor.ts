import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function advisorNode(state: typeof GraphState.State) {
  console.log("[AdvisorNode] Started. Input data:", JSON.stringify({ risksCount: state.risks?.length || 0 }));

  const { risks } = state;

  if (!risks || risks.length === 0) {
    console.warn("[AdvisorNode] No risks received. Returning empty report.");
    return { 
      finalReport: {
        advisorReport: [],
        overallVerdict: "No significant risks were identified. Proceed with standard caution."
      } 
    };
  }

  console.log(`[AdvisorNode] Inputs - Received ${risks.length} risks from Red Team.`);

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest", // Lightning fast, 1M TPM free limit
    temperature: 0,
  });

  const schema = z.object({
    advisorReport: z.array(z.object({
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
      clause: z.string(),
      trap: z.string().describe("One punchy sentence summarizing the trap (e.g., 'This clause lets them charge you indefinitely with zero notice.')"),
      harshReality: z.string().describe("2-3 sentences of what actually happens in the real world if this clause is triggered."),
      advice: z.string().describe("Open-ended, non-legal-advice guidance (e.g., 'You should ask them to cap this at X, or walk away.')")
    })).describe("Detailed advisor translation for each risk."),
    overallVerdict: z.string().describe("A single brutal paragraph summarizing whether to sign, negotiate, or run.")
  });

  const structuredLlm = llm.withStructuredOutput(schema, { name: "extract" });

  const risksText = JSON.stringify(risks, null, 2);

  const prompt = `You are a brutally honest senior counsel at a top-tier litigation firm. You are not a salesperson. You do not sugarcoat. You do not hedge.
Your job is to translate the raw legal risks identified by our adversarial team into harsh, actionable reality for a non-lawyer client.
Tell them exactly what they are walking into.

Raw Risks Identified:
${risksText}

For each risk, provide:
1. "trap": One punchy sentence summarizing the trap.
2. "harshReality": 2-3 sentences of what actually happens in the real world if triggered.
3. "advice": Open-ended, non-legal-advice guidance on what to do.
Finally, provide an "overallVerdict" summarizing if they should sign, negotiate, or run.

CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON matching the schema. Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.`;

  console.log(`[AdvisorNode] Raw Prompt (truncated): ${prompt.substring(0, 500)}...`);

  try {
    await sleep(3000); // Throttle to prevent Groq TPM burst limits
    const response = await withRetry(() => structuredLlm.invoke(prompt));
    console.log("[AdvisorNode] Zod validation passed!");
    console.log(`[AdvisorNode] Successfully finished. Final structured output writing to state: \n${JSON.stringify(response, null, 2).substring(0, 500)}...`);

    return {
      finalReport: response
    };
  } catch (error: any) {
    console.error("[AdvisorNode] CRITICAL ERROR:", error.message || error);
    return { 
      finalReport: {
        advisorReport: [],
        overallVerdict: "Failed to generate advisor report due to an internal error."
      } 
    };
  }
}
