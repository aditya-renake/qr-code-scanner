"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Scan,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Volume2,
  VolumeX,
  History,
} from "lucide-react";
import { sound } from "@/lib/sound";
import { Checkpoint, VerificationResult } from "@/lib/types";

export default function ScannerPage() {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>("cp-gate-entry");
  const [gateLocation, setGateLocation] = useState<string>("Gate A - Main Auditorium");
  const [scannedBy, setScannedBy] = useState<string>("Volunteer #1");

  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState("");

  const scannerRef = useRef<any>(null);
  const scannerContainerId = "qr-reader-container";

  const startScanner = async () => {
    try {
      setCameraError("");
      const { Html5Qrcode } = await import("html5-qrcode");

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (e) {}
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText: string) => {
          try {
            await html5QrCode.pause(true);
          } catch (e) {}
          await handleProcessScan(decodedText);
          setTimeout(async () => {
            try {
              await html5QrCode.resume();
            } catch (e) {}
          }, 2500);
        },
        () => {}
      );

      setScanning(true);
    } catch (err: any) {
      console.error("Camera start error:", err);
      setCameraError("Camera access unavailable in current view or permission denied. You can test manual key-in or direct QR verification below.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [selectedCheckpoint]);

  const handleProcessScan = async (qrText: string) => {
    if (isVerifying) return;
    setIsVerifying(true);

    try {
      const res = await fetch("/api/scan/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrContent: qrText,
          checkpointId: selectedCheckpoint,
          scannedBy,
          gateLocation,
        }),
      });

      const result: VerificationResult = await res.json();
      setLastResult(result);

      if (soundEnabled) {
        if (result.status === "ADMITTED") sound.playSuccess();
        else if (result.status === "ALREADY_CHECKED_IN") sound.playWarning();
        else sound.playError();
      }

      setScanHistory((prev) => [
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          result,
          qrText: qrText.slice(0, 35) + "...",
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err: any) {
      console.error(err);
      const fallbackResult: VerificationResult = {
        success: false,
        status: "INVALID_SIGNATURE",
        message: "Processing error: " + err.message,
      };
      setLastResult(fallbackResult);
      if (soundEnabled) sound.playError();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleProcessScan(manualCode.trim());
    setManualCode("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-emerald-400 uppercase">ORGANIZER GATE SCANNER</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">ONLINE</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-0.5">High-Speed Pass Verification</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition ${
              soundEnabled
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-500"
            }`}
            title={soundEnabled ? "Audio FX Active" : "Audio Muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition"
          >
            Command Dashboard
          </Link>
        </div>
      </div>

      <div className="cyber-card p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Active Checkpoint Target</label>
            <select
              value={selectedCheckpoint}
              onChange={(e) => setSelectedCheckpoint(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 font-bold focus:outline-none text-xs"
            >
              <option value="cp-gate-entry">🚪 Main Gate Check-in & Badge Pickup</option>
              <option value="cp-lunch-d1">🍕 Day 1 - Lunch Counter</option>
              <option value="cp-swag-kit">🎁 HackSeries Swag & Kit Desk</option>
              <option value="cp-midnight-snack">☕ Midnight Pizza & Red Bull</option>
              <option value="cp-lunch-d2">🍕 Day 2 - Lunch & Finale</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Gate Location</label>
            <input
              type="text"
              value={gateLocation}
              onChange={(e) => setGateLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold mb-1 block">Volunteer / Operator ID</label>
            <input
              type="text"
              value={scannedBy}
              onChange={(e) => setScannedBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="cyber-card p-4 rounded-3xl relative overflow-hidden border border-slate-800 shadow-2xl">
            <div className="relative rounded-2xl overflow-hidden bg-black min-h-[300px] flex items-center justify-center border border-slate-800">
              <div id={scannerContainerId} className="w-full h-full" />

              {scanning && (
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
                  <div className="relative w-full h-full border-2 border-dashed border-emerald-500/50 rounded-2xl flex items-center justify-center">
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent scanner-laser shadow-[0_0_15px_#10b981]" />
                    <p className="text-[11px] font-mono text-emerald-400/90 bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur border border-emerald-500/30">
                      POINT CAMERA AT PARTICIPANT QR PASS
                    </p>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="p-6 text-center space-y-2 max-w-sm">
                  <Camera className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-xs text-amber-300 font-semibold">Camera Access Notice</p>
                  <p className="text-[11px] text-slate-400">{cameraError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 mt-4">
              <button
                onClick={scanning ? stopScanner : startScanner}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  scanning
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{scanning ? "Pause Camera" : "Restart Camera"}</span>
              </button>

              <span className="text-[11px] text-slate-500 font-mono">
                {scanning ? "● Active Feed" : "○ Standby"}
              </span>
            </div>
          </div>

          <div className="cyber-card p-4 rounded-2xl space-y-2 border border-slate-800">
            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manual Check-in Fallback (For Damaged Screens / Bad Cameras)</span>
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Paste QR payload JSON or Reg ID (e.g. HS-2026-1001)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
              >
                Verify
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center justify-between">
            <span>Verification Status Card</span>
            {isVerifying && <span className="text-emerald-400 animate-pulse font-mono">Evaluating Cryptography...</span>}
          </div>

          {lastResult ? (
            <div
              className={`p-6 rounded-3xl border shadow-2xl transition-all space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
                lastResult.status === "ADMITTED"
                  ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-200 shadow-emerald-500/20"
                  : lastResult.status === "ALREADY_CHECKED_IN"
                  ? "bg-amber-950/60 border-amber-500/60 text-amber-200 shadow-amber-500/20"
                  : "bg-rose-950/60 border-rose-500/60 text-rose-200 shadow-rose-500/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {lastResult.status === "ADMITTED" && (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                )}
                {lastResult.status === "ALREADY_CHECKED_IN" && (
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
                  </div>
                )}
                {(lastResult.status === "INVALID_SIGNATURE" ||
                  lastResult.status === "NOT_FOUND" ||
                  lastResult.status === "REVOKED") && (
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <XCircle className="w-7 h-7 stroke-[2.5]" />
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-black tracking-tight leading-tight">
                    {lastResult.status === "ADMITTED" && "ADMITTED / VALID PASS"}
                    {lastResult.status === "ALREADY_CHECKED_IN" && "DUPLICATE SCAN DETECTED"}
                    {lastResult.status === "INVALID_SIGNATURE" && "COUNTERFEIT / TAMPERED"}
                    {lastResult.status === "NOT_FOUND" && "REGISTRATION NOT FOUND"}
                    {lastResult.status === "REVOKED" && "TICKET REVOKED"}
                  </h3>
                  <p className="text-xs opacity-90 font-medium">{lastResult.message}</p>
                </div>
              </div>

              {lastResult.attendee && (
                <div className="bg-[#090a12]/80 p-4 rounded-2xl border border-white/10 space-y-3 text-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-mono">{lastResult.attendee.regNumber}</p>
                      <h4 className="text-lg font-black text-white">{lastResult.attendee.fullName}</h4>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 uppercase font-mono">
                      {lastResult.attendee.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Team</span>
                      <span className="font-bold text-white truncate block">{lastResult.attendee.teamName}</span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Track</span>
                      <span className="font-bold text-cyan-300 truncate block">{lastResult.attendee.track}</span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">T-Shirt Size</span>
                      <span className="font-bold text-emerald-300">{lastResult.attendee.tShirtSize}</span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Meal Preference</span>
                      <span className="font-bold text-amber-300">{lastResult.attendee.dietaryPreference}</span>
                    </div>
                  </div>
                </div>
              )}

              {lastResult.status === "ALREADY_CHECKED_IN" && lastResult.firstScannedAt && (
                <div className="bg-amber-900/30 border border-amber-500/30 p-3 rounded-xl text-xs space-y-1 text-amber-300">
                  <p className="font-bold">Prior Scan Record:</p>
                  <p className="text-[11px] font-mono">
                    Time: {new Date(lastResult.firstScannedAt).toLocaleTimeString()} • Gate: {lastResult.firstScannedGate || "Main Gate"}
                  </p>
                  <p className="text-[10px] text-amber-200/80">
                    Anti-Passback Alert: The attendee already picked up their pass or food allocation. Do not admit a duplicate entry.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="cyber-card p-8 rounded-3xl text-center space-y-3 border border-slate-800">
              <Scan className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
              <h4 className="text-base font-bold text-slate-300">Scanner Ready</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Position any HackSeries QR code inside the camera box or submit an ID manually to verify instantly.
              </p>
            </div>
          )}

          {scanHistory.length > 0 && (
            <div className="cyber-card p-4 rounded-2xl space-y-2 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Recent Gate Scans ({scanHistory.length})</span>
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.result.status === "ADMITTED"
                            ? "bg-emerald-400"
                            : item.result.status === "ALREADY_CHECKED_IN"
                            ? "bg-amber-400"
                            : "bg-rose-400"
                        }`}
                      />
                      <span className="font-semibold text-slate-200">
                        {item.result.attendee?.fullName || "Unrecognized"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.result.attendee?.regNumber || ""}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
