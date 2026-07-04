export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { attempts = 3, baseDelayMs = 1000, label = "operação" } = options;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (err instanceof Error) {
        if (err.name === "AbortError") throw err;
        if (err.message.includes("401")) throw err;
      }

      const isRetryable =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.includes("503") ||
          err.message.includes("502") ||
          err.message.includes("500"));

      if (!isRetryable || i === attempts - 1) throw err;

      const delay = baseDelayMs * Math.pow(2, i);
      console.warn(
        `[retry] ${label} falhou (tentativa ${i + 1}/${attempts}), aguardando ${delay}ms...`
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw lastError;
}
