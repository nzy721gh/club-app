"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Member } from "@/lib/types";

const SCANNER_ID = "qr-scanner-region";

export default function ScanPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [target, setTarget] = useState<Member | null>(null);
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!operator || operator.role !== "admin")) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      scanner.stop().catch(() => {});
    }
  }

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  async function startScanning() {
    setScanError(null);
    setTarget(null);
    setMessage(null);
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220, aspectRatio: 1 },
        async (decodedText) => {
          const match = decodedText.match(/^member:(.+)$/);
          if (!match) return;

          stopScanner();
          setScanning(false);

          const { data } = await supabase
            .from("members")
            .select("*")
            .eq("id", match[1])
            .single();

          if (!data) {
            setScanError("Member not found");
            return;
          }
          setTarget(data);
        },
        () => {}
      );
      setScanning(true);
    } catch {
      setScanError("Could not start the camera, please check permissions");
    }
  }

  async function submitPoints(e: React.FormEvent) {
    e.preventDefault();
    if (!target || !operator) return;
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.from("point_logs").insert({
      member_id: target.id,
      points_delta: points,
      reason,
      operator_id: operator.id,
    });

    setSubmitting(false);

    if (error) {
      setMessage(`Failed: ${error.message}`);
      return;
    }

    setMessage(`Added ${points} pts to ${target.name}`);
    setTarget(null);
    setReason("");
    setPoints(1);
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Scan to Add Points</h1>

      {!target && (
        <div className="flex flex-col gap-3">
          <div
            id={SCANNER_ID}
            className="w-full aspect-square border border-border rounded-2xl overflow-hidden"
          />
          {!scanning && (
            <button
              onClick={startScanning}
              className="bg-accent text-white rounded-xl py-2 font-medium"
            >
              Start Scanning
            </button>
          )}
          {scanError && <p className="text-sm text-red-600">{scanError}</p>}
        </div>
      )}

      {target && (
        <form
          onSubmit={submitPoints}
          className="flex flex-col gap-3 border border-border rounded-2xl p-4"
        >
          <p className="font-medium">
            Member: {target.name} (currently {target.points} pts)
          </p>
          <label className="text-sm text-foreground/60">
            Points to add
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
            />
          </label>
          <label className="text-sm text-foreground/60">
            Reason
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Attended club event"
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-accent text-white rounded-xl py-2 font-medium disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setTarget(null)}
              className="flex-1 border border-border rounded-xl py-2 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}
