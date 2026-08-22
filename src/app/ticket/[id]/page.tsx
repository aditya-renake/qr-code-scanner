"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  QrCode,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Printer,
  Download,
  Copy,
  Check,
  AlertTriangle,
  User,
  Users,
  Award,
  Sparkles,
  Utensils,
  Gift,
  Coffee,
  CheckCircle2,
  Lock
} from "lucide-react";

export default function TicketPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<{
    attendee: any;
    qrDataURL: string;
    checkpoints: any[];
  } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    // Dynamic live timer to prevent static screenshot tampering
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false }) + "." + Math.floor(now.getMilliseconds() / 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const fetchTicket = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tickets/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load ticket");
      }
      setTicketData(data);
    } catch (e: any) {
      setError(e.message || "Could not retrieve ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400 font-mono">Verifying ticket cryptographic signature...</p>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <p className="text-sm text-slate-400">{error || "No valid registration matches this ID."}</p>
        <Link
          href="/register"
          className="inline-flex px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
        >
          Register for HackSeries
        </Link>
      </div>
    );
  }

  const { attendee, qrDataURL, checkpoints } = ticketData;

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    hacker: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/40" },
    mentor: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/40" },
    judge: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/40" },
    vip: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/40" },
    organizer: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/40" },
    volunteer: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/40" },
  };

  const roleBadge = roleColors[attendee.role] || roleColors.hacker;

  return (
    <div className="max-w-xl mx-auto space-y-6 py-2">
      {/* Top Action Bar (no-print) */}
      <div className="no-print flex items-center justify-between gap-2">
        <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
          ← Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Pass Link Copied!" : "Share Pass"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Badge</span>
          </button>
        </div>
      </div>

      {/* Main Holographic Ticket Badge */}
      <div className="cyber-badge rounded-3xl overflow-hidden relative shadow-2xl transition-all">
        {/* Holographic animated ribbon header */}
        <div className="holo-shimmer h-2 w-full" />

        {/* Dynamic Security Pulse Watermark (Anti-Screenshot Guard) */}
        <div className="no-print bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold">LIVE VERIFIED PASS</span>
          </div>
          <div className="text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>SYNC: {currentTime}</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Event & Reg Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">HACKSERIES 2026</span>
                <span className="text-[10px] text-slate-400 font-mono">• OFFICIAL PASS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 leading-tight">{attendee.fullName}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{attendee.college}</p>
            </div>

            <div className="text-right">
              <span className={`text-xs font-black tracking-wider px-3 py-1 rounded-lg border uppercase ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                {attendee.role}
              </span>
              <p className="text-xs font-mono font-bold text-cyan-400 mt-2">{attendee.regNumber}</p>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center shadow-inner relative group">
            <img
              src={qrDataURL}
              alt="Cryptographic QR Ticket"
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
            />
            <div className="mt-2 text-center">
              <p className="text-[11px] font-mono font-bold text-slate-900 tracking-wider">
                SCAN AT ENTRY GATES & FOOD COUNTERS
              </p>
              <p className="text-[9px] font-mono text-slate-500">
                HMAC-SHA256 SIGNED • HACKSERIES PASS ID: {attendee.regNumber}
              </p>
            </div>
          </div>

          {/* Attendee Metadata Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-200">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Team</span>
              <span className="font-bold text-white truncate block">{attendee.teamName}</span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Track</span>
              <span className="font-bold text-cyan-300 truncate block">{attendee.track}</span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Diet & Size</span>
              <span className="font-bold text-white">{attendee.dietaryPreference} • {attendee.tShirtSize}</span>
            </div>
          </div>

          {/* Event Venue & Time Info */}
          <div className="bg-[#090b12] p-3.5 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Oct 24–25, 2026 • 36-Hour Hackathon</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Main Innovation Auditorium & Arena, Campus Hub</span>
            </div>
          </div>

          {/* Checkpoint Multi-Stage Tracker */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
              <span>Event Perks & Checkpoints</span>
              <span className="text-[10px] text-emerald-400 font-mono">Automated Tracking</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                    cp.claimed
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                      : "bg-slate-900/50 border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {cp.claimed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-slate-200">{cp.name}</p>
                      {cp.claimed && (
                        <p className="text-[10px] text-emerald-400/80 font-mono">
                          Claimed at {new Date(cp.claimedAt).toLocaleTimeString()} ({cp.claimedGate})
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      cp.claimed ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {cp.claimed ? "CLAIMED" : "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Holographic animated ribbon footer */}
        <div className="holo-shimmer h-1.5 w-full" />
      </div>

      {/* Instructions / Notice (no-print) */}
      <div className="no-print bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-xs text-slate-400 space-y-2">
        <p className="font-semibold text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security & Entry Instructions:</span>
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed">
          <li>Please present this live QR code at the Main Gate check-in desk upon arrival.</li>
          <li>Each ticket is strictly non-transferable and can only be scanned once per checkpoint.</li>
          <li>Keep your device screen brightness at 100% when presenting to the optical scanner.</li>
        </ul>
      </div>
    </div>
  );
}
