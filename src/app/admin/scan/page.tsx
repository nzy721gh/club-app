"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Member, PointTemplate } from "@/lib/types";

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

  const [templates, setTemplates] = useState<PointTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", points_delta: 1, reason: "" });
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!operator || operator.role !== "admin")) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  useEffect(() => {
    if (operator?.role !== "admin") return;
    supabase
      .from("point_templates")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => setTemplates(data ?? []));
  }, [operator]);

  function applyTemplate(t: PointTemplate) {
    setSelectedTemplateId(t.id);
    setPoints(t.points_delta);
    setReason(t.reason);
  }

  async function addTemplate(e: React.FormEvent) {
    e.preventDefault();
    setTemplateError(null);
    const { data, error } = await supabase
      .from("point_templates")
      .insert(templateForm)
      .select()
      .single();

    if (error) {
      setTemplateError(error.message);
      return;
    }

    if (data) setTemplates([...templates, data]);
    setTemplateForm({ name: "", points_delta: 1, reason: "" });
  }

  async function deleteTemplate(id: string) {
    await supabase.from("point_templates").delete().eq("id", id);
    setTemplates(templates.filter((t) => t.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId(null);
  }

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
        { fps: 10 },
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
    if (!selectedTemplateId) {
      setReason("");
      setPoints(1);
    }
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Scan to Add Points</h1>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-foreground/60">Templates</h2>
          <button
            onClick={() => setShowTemplateForm(!showTemplateForm)}
            className="text-sm text-accent"
          >
            {showTemplateForm ? "Close" : "Manage"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className={`rounded-xl px-3 py-2 text-sm border ${
                selectedTemplateId === t.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border"
              }`}
            >
              {t.name} ({t.points_delta >= 0 ? "+" : ""}
              {t.points_delta})
            </button>
          ))}
          {templates.length === 0 && !showTemplateForm && (
            <p className="text-sm text-foreground/60">No templates yet</p>
          )}
        </div>

        {showTemplateForm && (
          <div className="flex flex-col gap-2 border border-border rounded-xl p-3">
            <form onSubmit={addTemplate} className="flex flex-col gap-2">
              <input
                required
                placeholder="Template name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                className="border border-border rounded-xl px-3 py-2 bg-background text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={templateForm.points_delta}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, points_delta: Number(e.target.value) })
                  }
                  className="w-24 border border-border rounded-xl px-3 py-2 bg-background text-sm"
                />
                <input
                  required
                  placeholder="Reason"
                  value={templateForm.reason}
                  onChange={(e) => setTemplateForm({ ...templateForm, reason: e.target.value })}
                  className="flex-1 min-w-0 border border-border rounded-xl px-3 py-2 bg-background text-sm"
                />
              </div>
              <button className="bg-accent text-white rounded-xl py-2 text-sm font-medium">
                Add Template
              </button>
              {templateError && (
                <p className="text-sm text-red-600">{templateError}</p>
              )}
            </form>
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-sm px-1"
              >
                <span>
                  {t.name} · {t.reason} · {t.points_delta >= 0 ? "+" : ""}
                  {t.points_delta}
                </span>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="text-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!target && (
        <div className="flex flex-col gap-3">
          <div className="relative w-full aspect-square border border-border rounded-2xl overflow-hidden">
            <div id={SCANNER_ID} className="w-full h-full [&_video]:!w-full [&_video]:!h-full [&_video]:object-cover" />
            {scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[60%] aspect-square border-4 border-white/90 rounded-lg" />
              </div>
            )}
          </div>
          {!scanning ? (
            <button
              onClick={startScanning}
              className="bg-accent text-white rounded-xl py-2 font-medium"
            >
              Start Scanning
            </button>
          ) : (
            <button
              onClick={() => {
                stopScanner();
                setScanning(false);
              }}
              className="border border-border rounded-xl py-2 font-medium"
            >
              Cancel
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
