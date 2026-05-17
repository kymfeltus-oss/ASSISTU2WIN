type PostgrestErrorLike = {
  readonly message?: string;
  readonly code?: string;
  readonly details?: string | null;
  readonly hint?: string | null;
  readonly name?: string;
};

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, nested) => {
      if (typeof nested === "bigint") {
        return nested.toString();
      }
      return nested;
    });
  } catch {
    return String(value);
  }
}

/** Never logs `{}` — always includes message/code/details/hint/name + fallback payload. */
export function serializeSupabaseError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message.length > 0 ? error.message : "Unknown error",
      code: null,
      details: null,
      hint: null,
      name: error.name,
      fallback: safeJsonStringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
      }),
    };
  }

  if (error !== null && typeof error === "object") {
    const record = error as PostgrestErrorLike & Record<string, unknown>;
    const rawPayload: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(record)) {
      rawPayload[key] = record[key];
    }

    const message =
      typeof record.message === "string" && record.message.trim().length > 0
        ? record.message
        : "Unknown PostgREST error";

    return {
      message,
      code: typeof record.code === "string" ? record.code : null,
      details:
        typeof record.details === "string"
          ? record.details
          : record.details === null
            ? null
            : null,
      hint:
        typeof record.hint === "string"
          ? record.hint
          : record.hint === null
            ? null
            : null,
      name: typeof record.name === "string" ? record.name : null,
      fallback: safeJsonStringify(rawPayload),
    };
  }

  const fallback = String(error);
  return {
    message: fallback,
    code: null,
    details: null,
    hint: null,
    name: null,
    fallback,
  };
}
