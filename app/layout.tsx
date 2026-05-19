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
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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

        {/* Critical CSS */}
        <style dangerouslySetInnerHTML={{ __html: ROOT_CRITICAL_CSS }} />

        {/* Prevent Flash */}
        <meta name="color-scheme" content="dark" />

      </head>

      <body className="relative overflow-x-hidden bg-[#030712] text-[#F8FAFC]">

        {/* Global Cinematic Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">

          {/* Base Gradient */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#030712,#06111E,#071827,#030712)]" />

          {/* Cyan Atmosphere */}
          <div className="absolute left-1/2 top-[-120px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#00D2FF]/10 blur-[140px]" />

          <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[#0284C7]/10 blur-[140px]" />

          {/* Grid Texture */}
          <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />

          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)]" />

        </div>

        {/* Main App */}
        <div className="relative z-10 min-h-dvh">

          <div className="app-viewport">

            <AppBottomNavGate>

              <div className="app-viewport__main">
                {children}
              </div>

            </AppBottomNavGate>

          </div>

        </div>

      </body>
    </html>
  );
}