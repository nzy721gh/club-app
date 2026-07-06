"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
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

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
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
        { fps: 10, qrbox: 220 },
        async (decodedText) => {
          const match = decodedText.match(/^member:(.+)$/);
          if (!match) return;

          await scanner.stop();
          setScanning(false);

          const { data } = await supabase
            .from("members")
            .select("*")
            .eq("id", match[1])
            .single();

          if (!data) {
            setScanError("未找到该会员");
            return;
          }
          setTarget(data);
        },
        () => {}
      );
      setScanning(true);
    } catch {
      setScanError("无法启动摄像头，请检查权限");
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
      setMessage(`失败：${error.message}`);
      return;
    }

    setMessage(`已为 ${target.name} 增加 ${points} 分`);
    setTarget(null);
    setReason("");
    setPoints(1);
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">加载中...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">扫码录入积分</h1>

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
              开始扫码
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
            会员：{target.name}（当前 {target.points} 分）
          </p>
          <label className="text-sm text-foreground/60">
            本次加分
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
            />
          </label>
          <label className="text-sm text-foreground/60">
            原因
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：参加社团活动"
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-accent text-white rounded-xl py-2 font-medium disabled:opacity-50"
            >
              {submitting ? "提交中..." : "确认加分"}
            </button>
            <button
              type="button"
              onClick={() => setTarget(null)}
              className="flex-1 border border-border rounded-xl py-2 font-medium"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}
