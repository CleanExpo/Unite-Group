// Langfuse tracing seam (adopt-not-build: Langfuse is the chosen observability tool).
// Wire the real client via LANGFUSE_* env here; until then it's a transparent pass-through.
export async function trace<T>(
  name: string,
  metadata: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } finally {
    // langfuse.trace({ name, metadata }) — emit span on completion.
    void name;
    void metadata;
  }
}
