import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "StemForge AI — Hierarchical Stem Separation",
  description:
    "Upload a song and separate it into vocals, drums, bass, guitar, synth — then go deeper: lead vs backing vocals, kick vs snare vs cymbals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-slate-200">
        {/* Nav */}
        <header className="border-b border-[#1e1e35] px-6 py-3 flex items-center gap-3 bg-[#08080f]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="4" width="2" height="8" rx="1" fill="white" fillOpacity=".9" />
                <rect x="5" y="2" width="2" height="12" rx="1" fill="white" />
                <rect x="9" y="5" width="2" height="6" rx="1" fill="white" fillOpacity=".7" />
                <rect x="13" y="3" width="2" height="10" rx="1" fill="white" fillOpacity=".5" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight">StemForge AI</span>
          </div>
          <span className="px-2 py-0.5 text-[10px] rounded-full border border-violet-500/30 text-violet-400 font-mono bg-violet-500/5">
            BETA
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Powered by Demucs
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-10">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        <footer className="border-t border-border mt-20 px-6 py-6 text-center text-xs text-slate-500">
          Powered by Demucs · Open-source AI · No data stored after 6 h
        </footer>
      </body>
    </html>
  );
}
