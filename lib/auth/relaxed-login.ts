/**
 * Local dev helper: relax login redirects and admin gates so you can sign in/out
 * without fighting the proxy or leads admin wall.
 *
 * Set NEXT_PUBLIC_AUTH_RELAXED=0 to disable in development.
 */
export function isRelaxedLogin(): boolean {
  const explicit =
    process.env.NEXT_PUBLIC_AUTH_RELAXED ??
    process.env.NEXT_PUBLIC_PARABLE_DEV_GUEST;

  if (explicit === "0" || explicit === "false") {
    return false;
  }
  if (explicit === "1" || explicit === "true") {
    return true;
  }

  return process.env.NODE_ENV === "development";
}
