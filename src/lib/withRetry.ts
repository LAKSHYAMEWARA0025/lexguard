export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
  delayMs = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error?.message || error);
    if (error?.status === 400 || error?.status === 500 || errorStr.includes("400") || errorStr.includes("500")) {
      throw error;
    }
    if (retries === 0) throw error;
    console.warn(`[RETRY SYSTEM] API Call Failed. Retrying in ${delayMs / 1000}s... (${retries} attempts left). Error:`, error.message || error);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(fn, retries - 1, delayMs); // Flat delay
  }
}
