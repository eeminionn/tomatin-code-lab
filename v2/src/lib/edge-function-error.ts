export async function edgeFunctionErrorMessage(
  error: unknown,
  fallbackMessage = "El servicio remoto no respondió.",
): Promise<string> {
  const fallback =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallbackMessage;
  const context =
    typeof error === "object" && error !== null && "context" in error
      ? error.context
      : null;
  if (!(context instanceof Response)) return fallback;

  try {
    const payload = (await context.clone().json()) as {
      error?: unknown;
      message?: unknown;
    };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Keep the SDK message when the function did not return JSON.
  }
  return fallback;
}
