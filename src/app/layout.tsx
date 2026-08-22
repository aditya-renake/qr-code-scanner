import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { QrCode, Scan, LayoutDashboard, UserPlus, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "HackSeries Pass | Secure Event QR & Check-in System",
  description: "Cryptographic QR ticket generation, tamper-proof verification, and multi-stage gate check-in system for hackathons.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="cyber-gradient min-h-screen flex flex-col text-slate-100 antialiased selection:bg-emerald-500 selection:text-black">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0b10]/85 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#0a0b10] rounded-[10px] flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-emerald-400 group-hover:text-cyan-300 transition-colors" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black tracking-wider text-lg bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                    HACKSERIES
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-semibold">
                    PASS v2.6
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Smart QR & Gate System</p>
              </div>
            </Link>

            {/* Navigation links */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Register / Ticket</span>
              </Link>
              <Link
                href="/scan"
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/10"
              >
                <Scan className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-semibold">Gate Scanner</span>
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#07080c] py-6 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>HMAC-SHA256 Cryptographically Secured Pass Engine</span>
            </div>
            <p>© 2026 HackSeries. Built for high-throughput hackathon check-ins.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
