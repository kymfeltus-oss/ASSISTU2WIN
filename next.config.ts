import type { NextConfig } from "next";

/**
 * Locks Turbopack’s compilation root to this project (avoids picking up a
 * parent `package-lock.json` / wrong workspace root).
 *
 * Note: Next.js 16 expects `turbopack` on the config root. Older docs used
 * `experimental.turbopack`, which is no longer valid here.
 *
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
 */
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
