/**
 * Official ASSIST U2 WIN brand logo (same asset as CodePen preview).
 * File: /public/branding/assist-u-2-win-logo.png
 * Served: /branding/assist-u-2-win-logo.png
 *
 * Remote reference (for manual re-export only — app uses local file):
 * https://assets.codepen.io/17388899/ChatGPT+Image+May+18%2C+2026%2C+05_39_55+PM.png
 */

export const BRAND_LOGO_SRC =
  "/branding/assist-u-2-win-logo.png" as const;

export const BRAND_LOGO_ALT = "ASSIST U2 WIN" as const;

/** Base class — pair with `brand-logo--*` size modifiers in globals.css */
export const BRAND_LOGO_CLASS = "brand-logo" as const;

export const BRAND_LOGO_LOAD_ERROR =
  "Image failed to load — re-copy URL from Assets (Copy as HTML img)." as const;