"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Scan,
  ShieldCheck,
  Zap,
  Users,
  Utensils,
  Gift,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  RefreshCw,
  Search
} from "lucide-react";

export default function HomePage() {
  const [stats, setStats] = useState<{ totalRegistered: number; totalCheckedIn: number; attendanceRate: number } | null>(null);
  const [ticketLookup, setTicketLookup] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketLookup.trim()) return;
    window.location.href = `/ticket/${encodeURIComponent(ticketLookup.trim())}`;
  };

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>HackSeries 2026 • Official Pass & Gate System</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Cryptographic QR Tickets & <br />
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
            Instant Gate Verification
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Only verified, registered attendees get valid tickets. Equipped with HMAC-SHA256 tamper protection, anti-passback duplicate detection, and multi-stage checkpoint tracking for food and swag.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <QrCode className="w-5 h-5" />
            <span>Register & Get QR Ticket</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <Link
            href="/scan"
            className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-sm sm:text-base flex items-center gap-2 transition-all transform hover:-translate-y-0.5 shadow-md"
          >
            <Scan className="w-5 h-5 text-emerald-400" />
            <span>Launch Gate Scanner</span>
          </Link>

          <Link
            href="/dashboard"
            className="px-5 py-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 text-slate-300 font-medium text-sm sm:text-base flex items-center gap-2 transition"
          >
            <span>Organizer Command Center</span>
          </Link>
        </div>

        {/* Quick Demo Seeder Banner */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
            <span>{isSeeding ? "Seeding Demo Data..." : "Load Demo Hackathon Data (8 Hackers + Scans)"}</span>
          </button>
        </div>
      </section>

      {/* Ticket Lookup Box */}
      <section className="max-w-xl mx-auto">
        <div className="cyber-card p-5 rounded-2xl border border-slate-800/80 shadow-xl">
          <div className="flex items-center gap-2 mb-3 text-slate-300 font-medium text-sm">
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Already Registered? Find Your Pass</span>
          </div>
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Reg ID (e.g. HS-2026-1001) or Email"
              value={ticketLookup}
              onChange={(e) => setTicketLookup(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm font-mono"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition flex items-center gap-1.5"
            >
              <span>View Pass</span>
            </button>
          </form>
        </div>
      </section>

      {/* Live Event Pulse Stats */}
      {stats && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="cyber-card p-5 rounded-2xl text-center space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Registered</p>
            <p className="text-3xl font-black text-white font-mono">{stats.totalRegistered}</p>
            <p className="text-[11px] text-emerald-400 font-medium">All Confirmed Attendees</p>
          </div>
          <div className="cyber-card p-5 rounded-2xl text-center space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Checked-In at Gate</p>
            <p className="text-3xl font-black text-emerald-400 font-mono">{stats.totalCheckedIn}</p>
            <p className="text-[11px] text-slate-400 font-medium">{stats.attendanceRate}% Attendance Rate</p>
          </div>
          <div className="cyber-card p-5 rounded-2xl text-center space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tamper & Forgery Rate</p>
            <p className="text-3xl font-black text-cyan-400 font-mono">0.0%</p>
            <p className="text-[11px] text-emerald-400 font-medium">HMAC-SHA256 Protected</p>
          </div>
        </section>
      )}

      {/* Core Architectural Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="cyber-card p-6 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Cryptographic Anti-Forgery</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every QR code is signed with a secret HMAC hash. Anyone altering the ID, name, or role is immediately rejected by the gate scanner.
          </p>
        </div>

        <div className="cyber-card p-6 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Zero-Passback Duplicate Guard</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Instant real-time check-in locking. If a participant screenshots their ticket to sneak a friend inside, the second scan triggers an immediate alarm.
          </p>
        </div>

        <div className="cyber-card p-6 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Utensils className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Multi-Stage Checkpoints</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            One single ticket pass governs Main Gate Entry, Lunch Day 1 & 2, Swag Kit pickup, and Midnight Energy Refills with independent tracking.
          </p>
        </div>
      </section>
    </div>
  );
}
