import { Geist, Geist_Mono, Great_Vibes } from "next/font/google";

/** App UI fonts — swap display avoids invisible text during LCP. */
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Dashboard script accent only — not loaded on public intake routes. */
export const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
