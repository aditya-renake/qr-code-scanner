"use client";

import { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  User,
  Mail,
  Phone,
  School,
  Users,
  Tag,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Download,
  Share2
} from "lucide-react";
import { AttendeeRole, TrackType } from "@/lib/types";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    college: "",
    teamName: "",
    role: "hacker" as AttendeeRole,
    track: "AI & Machine Learning" as TrackType,
    tShirtSize: "L" as "S" | "M" | "L" | "XL" | "XXL",
    dietaryPreference: "Vegetarian" as "Vegetarian" | "Non-Vegetarian" | "Vegan" | "Jain",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    attendee: any;
    qrDataURL: string;
    isExisting: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Registration failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>HackSeries 2026 Registration</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Event Registration & Instant QR Pass</h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Fill in your participant details below to generate your official, cryptographically signed HackSeries entry pass.
        </p>
      </div>

      {result ? (
        /* Success / Issued Pass Preview */
        <div className="cyber-card p-6 sm:p-8 rounded-3xl space-y-6 border border-emerald-500/40 shadow-2xl">
          <div className="flex items-center gap-3 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl">
            <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
            <div>
              <p className="font-bold text-base text-emerald-200">
                {result.isExisting ? "Existing Pass Retrieved!" : "Registration Successful! Pass Issued."}
              </p>
              <p className="text-xs text-emerald-300/80">
                Your pass is secured with HMAC-SHA256 and ready for gate check-in.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#0a0b12] p-6 rounded-2xl border border-slate-800">
            {/* QR Code */}
            <div className="bg-white p-3 rounded-xl shadow-lg flex-shrink-0">
              <img
                src={result.qrDataURL}
                alt="Ticket QR Code"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
            </div>

            {/* Attendee Details */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                  {result.attendee.role}
                </span>
                <h3 className="text-xl font-black text-white mt-1">{result.attendee.fullName}</h3>
                <p className="text-xs text-slate-400 font-mono">{result.attendee.regNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Team</span>
                  <span className="font-semibold">{result.attendee.teamName}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Track</span>
                  <span className="font-semibold truncate block">{result.attendee.track}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">T-Shirt Size</span>
                  <span className="font-semibold">{result.attendee.tShirtSize}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Diet</span>
                  <span className="font-semibold">{result.attendee.dietaryPreference}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  href={`/ticket/${result.attendee.id}`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Open Full Digital Badge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setResult(null)}
              className="text-xs text-slate-400 hover:text-white underline transition"
            >
              Register Another Attendee
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="cyber-card p-6 sm:p-8 rounded-3xl space-y-6 border border-slate-800 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Aditya Renake"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Email Address *</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. aditya@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone / WhatsApp</span>
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            {/* College / Organization */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-slate-400" />
                <span>College / Organization</span>
              </label>
              <input
                type="text"
                placeholder="e.g. IIT Bombay / Freelance"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            {/* Team Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Team Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. NeuralForge"
                value={formData.teamName}
                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Event Role *</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as AttendeeRole })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-purple-500 text-sm"
              >
                <option value="hacker">Hacker (Participant)</option>
                <option value="mentor">Mentor & Advisor</option>
                <option value="judge">Judge / Jury Panel</option>
                <option value="vip">VIP / Sponsor Guest</option>
                <option value="organizer">Organizer Core</option>
                <option value="volunteer">Volunteer Crew</option>
              </select>
            </div>

            {/* Track */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Innovation Track / Theme *</span>
              </label>
              <select
                value={formData.track}
                onChange={(e) => setFormData({ ...formData, track: e.target.value as TrackType })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-amber-500 text-sm"
              >
                <option value="AI & Machine Learning">🤖 AI & Machine Learning</option>
                <option value="Web3 & Blockchain">⛓️ Web3 & Blockchain</option>
                <option value="FinTech & Security">💳 FinTech & Security</option>
                <option value="HealthTech & Bio">🧬 HealthTech & Bio</option>
                <option value="Open Innovation">🚀 Open Innovation</option>
              </select>
            </div>

            {/* T-Shirt Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">T-Shirt Size (Swag Kit)</label>
              <select
                value={formData.tShirtSize}
                onChange={(e) => setFormData({ ...formData, tShirtSize: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm"
              >
                <option value="S">Small (S)</option>
                <option value="M">Medium (M)</option>
                <option value="L">Large (L)</option>
                <option value="XL">Extra Large (XL)</option>
                <option value="XXL">Double XL (XXL)</option>
              </select>
            </div>

            {/* Dietary Preference */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Dietary Preference</label>
              <select
                value={formData.dietaryPreference}
                onChange={(e) => setFormData({ ...formData, dietaryPreference: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm"
              >
                <option value="Vegetarian">Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Jain">Jain</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-400 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{loading ? "Generating Cryptographic Pass..." : "Confirm Sign-Up & Issue QR Ticket"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
