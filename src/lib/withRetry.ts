export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error?.message || error).toLowerCase();
    if (error?.status === 400 || error?.status === 500 || errorStr.includes("400") || errorStr.includes("500")) {
      throw error;
    }
    
    if (retries === 0) {
      console.error("[API Rate Limit] Failed after 2 retries:", error);
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    const isRateLimit = error?.status === 429 || errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("rate limit");
    
    const waitTime = isRateLimit ? delayMs : 2000;
    const nextDelayMs = isRateLimit ? delayMs * 2 : 2000;

    console.warn(`[RETRY SYSTEM] API Call Failed. Retrying in ${waitTime / 1000}s... (${retries} attempts left). Error:`, error.message || error);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    return withRetry(fn, retries - 1, nextDelayMs);
  }
}
