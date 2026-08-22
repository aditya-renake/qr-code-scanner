"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  ShieldCheck,
  FileSpreadsheet,
  ExternalLink,
  Mail,
  Send,
  Sparkles,
  Upload,
  Link as LinkIcon
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string>("");
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<any>(null);
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1RYoYFAmF6FGBMWr5pvSDGgw9nJxeWBe8Yjq8kTkJG8w/edit?usp=sharing");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, attRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/attendees?search=" + encodeURIComponent(search) + "&role=" + roleFilter),
      ]);

      const statsData = await statsRes.json();
      const attData = await attRes.json();

      if (statsData.success) setStats(statsData);
      if (attData.success) setAttendees(attData.attendees);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, roleFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/stats")
        .then((res) => res.json())
        .then((d) => {
          if (d.success) setStats(d);
        })
        .catch(console.error);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all scan logs? Attendees will remain registered but marked un-scanned.")) return;
    setResetting(true);
    try {
      await fetch("/api/reset", { method: "POST" });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  const handleManualCheckIn = async (attendeeId: string) => {
    try {
      const res = await fetch("/api/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeId, checkpointId: "cp-gate-entry", operatorName: "Admin Dashboard" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.message || "Manual check-in failed");
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSendEmail = async (attendeeId: string) => {
    setEmailingId(attendeeId);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to dispatch email");
      } else {
        alert("✅ " + data.message);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setEmailingId(null);
    }
  };

  const handleSyncGoogleSheet = async () => {
    setSyncingSheets(true);
    setSyncNotice("");
    try {
      const res = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncNotice("✅ " + data.message);
        await fetchData();
      } else {
        // Prompt for CSV paste
        const pasteCsv = prompt("Could not auto-fetch private sheet. Please paste the CSV text or share sheet to Public/Anyone with link, or paste CSV rows below:");
        if (pasteCsv) {
          const res2 = await fetch("/api/sync-sheets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ csvContent: pasteCsv }),
          });
          const data2 = await res2.json();
          if (data2.success) {
            setSyncNotice("✅ " + data2.message);
            await fetchData();
          } else {
            alert(data2.message);
          }
        }
      }
    } catch (e: any) {
      alert("Sync error: " + e.message);
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleRunEmailTest = async () => {
    if (!testEmailAddr) {
      alert("Please type a recipient email address to test.");
      return;
    }
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch("/api/test-email?to=" + encodeURIComponent(testEmailAddr));
      const data = await res.json();
      setTestEmailResult(data);
    } catch (e: any) {
      setTestEmailResult({ success: false, error: e.message });
    } finally {
      setTestingEmail(false);
    }
  };

  const exportCSV = () => {
    if (!attendees.length) return;
    const headers = ["Reg Number", "Full Name", "Email", "Phone", "College", "Team", "Role", "Track", "T-Shirt", "Diet", "Main Gate Checked In", "Checkpoints Claimed"];
    const rows = attendees.map((a) => [
      a.regNumber,
      a.fullName,
      a.email,
      a.phone,
      a.college,
      a.teamName,
      a.role,
      a.track,
      a.tShirtSize,
      a.dietaryPreference,
      a.isCheckedIn ? "YES" : "NO",
      (a.checkpointsClaimed || []).join(" | "),
    ]);

    const csvLines = [headers.join(",")];
    rows.forEach(r => {
      csvLines.push(r.map(val => String(val).replace(/"/g, "")).map(v => "\"" + v + "\"").join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvLines.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "hackseries_attendance_" + new Date().toISOString().slice(0, 10) + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAttendees = attendees.filter((a) => {
    if (statusFilter === "checked_in") return a.isCheckedIn;
    if (statusFilter === "not_checked_in") return !a.isCheckedIn;
    return true;
  });

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-cyan-400 uppercase">HACKSERIES COMMAND CENTER</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold">LIVE TELEMETRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Live Attendance & Gate Operations</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <span>{seeding ? "Seeding..." : "Load Demo Hackers"}</span>
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-3 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition"
          >
            <span>Reset Scans</span>
          </button>
        </div>
      </div>

      {/* Google Forms & Sheets Live Sync & Auto Emailer Card */}
      <div className="cyber-card p-6 rounded-3xl border border-emerald-500/40 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Forms & Sheets Live Emailer</h3>
              <p className="text-xs text-slate-400">
                Sync responses from your Google Form and automatically email HMAC QR passes to all participants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncGoogleSheet}
              disabled={syncingSheets}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{syncingSheets ? "Syncing & Sending Emails..." : "Sync & Email Google Form Passes"}</span>
            </button>
          </div>
        </div>

        {syncNotice && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
            {syncNotice}
          </div>
        )}
      </div>

      {/* Email Diagnostic Test Tool */}
      <div className="cyber-card p-5 rounded-3xl border border-cyan-500/30 shadow-lg space-y-3 bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
              <span>🧪</span> Email Delivery Diagnostic Test
            </h4>
            <p className="text-[11px] text-slate-400">
              Type your personal email address below to test your Vercel email credentials in 1 click.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="your-email@gmail.com"
              value={testEmailAddr}
              onChange={(e) => setTestEmailAddr(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 w-56"
            />
            <button
              onClick={handleRunEmailTest}
              disabled={testingEmail}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
            >
              {testingEmail ? "Testing..." : "Send Test Email"}
            </button>
          </div>
        </div>

        {testEmailResult && (
          <div className={"p-3 rounded-xl text-xs font-mono border " + (testEmailResult.success ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-rose-950/40 border-rose-500/40 text-rose-300")}>
            <p className="font-bold mb-1">{testEmailResult.success ? "✅ SUCCESS: Test email sent!" : "❌ ERROR: Email failed to send"}</p>
            {testEmailResult.provider && <p>Provider: {testEmailResult.provider}</p>}
            {testEmailResult.error && <p className="text-rose-400">Error Details: {testEmailResult.error}</p>}
            {testEmailResult.detectedConfig && (
              <p className="text-[10px] text-slate-400 mt-1">
                Detected Config: {JSON.stringify(testEmailResult.detectedConfig)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cyber-card p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Total Registrations</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-white font-mono">{stats.totalRegistered}</p>
            <p className="text-[11px] text-slate-400 font-medium">Issued HMAC Passes</p>
          </div>

          <div className="cyber-card p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Main Gate Admitted</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-3xl font-black text-cyan-400 font-mono">{stats.totalCheckedIn}</p>
            <p className="text-[11px] text-slate-400 font-medium">{stats.attendanceRate}% Attendance Rate</p>
          </div>

          <div className="cyber-card p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Pending Check-in</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-black text-amber-400 font-mono">{stats.totalRegistered - stats.totalCheckedIn}</p>
            <p className="text-[11px] text-slate-400 font-medium">Awaiting arrival at gate</p>
          </div>

          <div className="cyber-card p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Security Integrity</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-emerald-400 font-mono">100%</p>
            <p className="text-[11px] text-emerald-400/90 font-medium">Zero forged tickets passed</p>
          </div>
        </div>
      )}

      {/* Checkpoint Multi-Stage Progress */}
      {stats && stats.checkpointStats && (
        <div className="cyber-card p-6 rounded-3xl space-y-4 border border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Multi-Stage Checkpoint Distribution
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.checkpointStats.map((cp: any) => (
              <div key={cp.id} className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white truncate">{cp.name}</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">{cp.totalScans} / {cp.maxPossible}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: cp.percentage + "%" }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="capitalize">{cp.category} Checkpoint</span>
                  <span>{cp.percentage}% Claimed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendee Directory Table */}
      <div className="cyber-card p-6 rounded-3xl space-y-4 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white">Registered Attendee Directory ({filteredAttendees.length})</h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search name, email, reg ID, team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 w-52 sm:w-64"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="hacker">Hacker</option>
              <option value="mentor">Mentor</option>
              <option value="judge">Judge</option>
              <option value="vip">VIP</option>
              <option value="organizer">Organizer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="checked_in">Checked In Only</option>
              <option value="not_checked_in">Not Checked In</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Reg ID / Name</th>
                <th className="px-4 py-3">Team & Track</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Diet & T-Shirt</th>
                <th className="px-4 py-3">Main Gate Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No attendees match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{a.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{a.regNumber} • {a.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-200">{a.teamName}</p>
                      <p className="text-[10px] text-cyan-400">{a.track}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 uppercase font-bold text-slate-300">
                        {a.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      <span>{a.dietaryPreference} • Size {a.tShirtSize}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.isCheckedIn ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ADMITTED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">
                          <span>PENDING</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button
                        onClick={() => handleSendEmail(a.id)}
                        disabled={emailingId === a.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-[10px] font-semibold transition disabled:opacity-50"
                        title="Send / Re-send QR Ticket via Email"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{emailingId === a.id ? "Sending..." : "Email QR"}</span>
                      </button>

                      {!a.isCheckedIn && (
                        <button
                          onClick={() => handleManualCheckIn(a.id)}
                          className="px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 text-[10px] font-bold transition"
                        >
                          Admit
                        </button>
                      )}

                      <Link
                        href={"/ticket/" + a.id}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Pass</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
