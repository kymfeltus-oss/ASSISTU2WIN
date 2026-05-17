export type PostgrestErrorLike = {
  readonly message?: string;
  readonly code?: string;
  readonly details?: string | null;
  readonly hint?: string | null;
  readonly name?: string;
};

export function isMissingColumnError(
  error: PostgrestErrorLike,
  tableOrColumn: string,
): boolean {
  if (error.code === "42703") {
    const message = error.message?.toLowerCase() ?? "";
    return message.includes(tableOrColumn.toLowerCase());
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes(`column appointments.${tableOrColumn}`) ||
    message.includes(`'${tableOrColumn}'`)
  );
}

export function isSchemaUnavailableError(error: PostgrestErrorLike): boolean {
  if (error.code === "PGRST205") {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("public.appointments") ||
    message.includes("table 'appointments'") ||
    message.includes('table "appointments"')
  );
}

export function isRlsOrPermissionError(error: PostgrestErrorLike): boolean {
  if (error.code === "42501") {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not authorized")
  );
}
