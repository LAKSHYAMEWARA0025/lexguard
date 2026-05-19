import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { GraphState } from "../state";
import { withRetry } from "../../lib/withRetry";


export async function verifierNode(state: typeof GraphState.State) {
  console.log("[VerifierNode] Started. Input data:", JSON.stringify({ retrievedChunksCount: state.retrievedChunks?.length || 0, risksCount: state.risks?.length || 0 }));

  const { retrievedChunks, risks } = state;

  if (!risks || risks.length === 0) {
    console.log("[VerifierNode] No risks to verify. Passing state forward.");
    return { risks: [] };
  }

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest",
    temperature: 0,
  });

  // We mirror the Red Team's risk schema to seamlessly overwrite the state
  const schema = z.object({
    verifiedRisks: z.array(z.object({
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
      clause: z.string().describe("The exact wording from the text."),
      issue: z.string().describe("Plain-English explanation of the issue. Must be strictly grounded in the text."),
      recommendation: z.string()
    })).describe("The final, filtered list of risks that are 100% verified against the source text.")
  });

  const structuredLlm = llm.withStructuredOutput(schema, { name: "extract" });

  const chunkContext = retrievedChunks.map(c => c.content).join("\n\n---\n\n");
  const risksToVerify = JSON.stringify(risks, null, 2);

  const prompt = `You are a strict Legal Auditor. Your primary directive is to prevent AI hallucinations.
  An aggressive "Red Team" AI has flagged the following potential risks in a contract:
  ${risksToVerify}

  Here is the actual, raw source text of the contract:
  ${chunkContext}

  TASK:
  1. Cross-reference every single flagged risk against the source text.
  2. If a risk is NOT explicitly supported by the source text, DELETE IT completely. Do not guess or assume.
  3. If a risk IS supported, keep it. You must rewrite the 'clause' to match the exact wording in the text, and tone down any exaggerated claims in the 'issue' description.
  4. Return ONLY the fully verified risks. If none are valid, return an empty array.
  
  CRITICAL FORMATTING INSTRUCTION: You must return ONLY raw, valid JSON matching the schema. Do NOT wrap your response in markdown blocks (\`\`\`json). Do NOT output <function=extract> tags or any other conversational text. Just the JSON object.`;

  try {
    const response = await withRetry(() => structuredLlm.invoke(prompt));
    console.log(`[VerifierNode] Successfully finished. Verified ${response.verifiedRisks.length}/${risks.length} risks.`);

    // Overwrite the unverified risks with the strictly verified ones
    return { risks: response.verifiedRisks };
  } catch (error: any) {
    console.error("[VerifierNode] CRITICAL ERROR:", error.message || error);
    // If parsing fails, return original risks so pipeline doesn't crash, but log the failure
    return { risks };
  }
}
