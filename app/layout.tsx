import { AppBottomNavGate } from "@/components/navigation/AppBottomNavGate";
import { ROOT_CRITICAL_CSS } from "@/lib/critical-css";
import { geistMono, geistSans } from "@/lib/fonts";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assist U 2 Win | The Home Buying Collective",
  description:
    "Assist U 2 Win — The Home Buying Collective. Admin lead intake and AI copilot for residential real estate.",
};

export const viewport: Viewport = {
  themeColor: "#030712",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: ROOT_CRITICAL_CSS }} />
      </head>
      <body className="midnight-canvas-gradient flex min-h-dvh flex-col text-[color:var(--text-primary)]">
        <AppBottomNavGate>{children}</AppBottomNavGate>
      </body>
    </html>
  );
}
