// Both chat surfaces use the same bounded Edge → server fallback flow.
export type ConciergePayload = {
  language: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

type Reply = { reply?: unknown };

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("The concierge request timed out"));
    }, 18_000);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function requestConcierge(
  edge: (signal: AbortSignal) => Promise<{ data: Reply | null; error: unknown }>,
  server: () => Promise<Reply>,
): Promise<string> {
  try {
    const { data, error } = await withTimeout(edge);
    if (!error && typeof data?.reply === "string" && data.reply.trim()) {
      return data.reply.trim();
    }
  } catch {
    // Unavailable, undeployed, or slow Edge Functions must not block the fallback.
  }

  const result = await withTimeout(() => server());
  if (typeof result.reply !== "string" || !result.reply.trim()) {
    throw new Error("No answer was returned");
  }
  return result.reply.trim();
}
