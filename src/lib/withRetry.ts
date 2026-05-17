export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 15000 // 15 seconds to wait out the Gemini free-tier quota limit
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    console.warn(`[RETRY SYSTEM] API Call Failed. Retrying in ${delayMs / 1000}s... (${retries} attempts left). Error:`, error.message || error);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(fn, retries - 1, delayMs * 1.5); // Exponential backoff
  }
}
