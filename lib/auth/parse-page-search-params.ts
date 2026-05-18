/** Adapt Next.js `searchParams` to `URLSearchParams.get`. */
export function pageSearchParamsGetter(
  params: Record<string, string | string[] | undefined>,
): Pick<URLSearchParams, "get"> {
  return {
    get(key: string): string | null {
      const value = params[key];
      if (typeof value === "string") return value;
      if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
      return null;
    },
  };
}
