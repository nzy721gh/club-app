"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { PointLog } from "@/lib/types";

type PointLogWithEvent = PointLog & { events: { name: string } | null };

export default function MePage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [pointLogs, setPointLogs] = useState<PointLogWithEvent[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  function downloadQrCode() {
    const canvas = qrCanvasRef.current;
    if (!canvas || !member) return;

    const link = document.createElement("a");
    link.download = `${member.name}-qr-code.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  useEffect(() => {
    if (!loading && !member) {
      router.push("/login");
    }
  }, [loading, member, router]);

  useEffect(() => {
    if (!member) return;

    supabase
      .from("point_logs")
      .select("*, events(name)")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPointLogs((data as unknown as PointLogWithEvent[]) ?? []));
  }, [member]);

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="page-stack">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header">
          <p className="eyebrow">Member pass</p>
          <h1 className="page-title">Hi, {member.name.split(" ")[0]}</h1>
          <p className="page-subtitle">Show your QR code at events to earn points and validate your membership.</p>
        </div>
        <Link
          href="/settings"
          className="secondary-button !px-3 !py-2"
        >
          Settings
        </Link>
      </div>

      <div className="surface-card relative flex flex-col items-center gap-3 overflow-hidden p-6 sm:p-8">
        {member.membership_tier === "committee" && (
          <span className="bg-primary text-white text-sm font-bold tracking-wide px-4 py-1.5 rounded-full shadow mb-3">
            COMMITTEE
          </span>
        )}
        {member.membership_tier === "paid" && (
          <span className="bg-accent text-white text-sm font-bold tracking-wide px-4 py-1.5 rounded-full shadow mb-3">
            PAID MEMBER
          </span>
        )}
        <div className="rounded-3xl bg-white p-4 shadow-inner"><QRCodeCanvas ref={qrCanvasRef} value={`member:${member.id}`} size={180} /></div>
        <p className="font-semibold text-lg">{member.name}</p>
        <p className="text-5xl font-black tracking-tight text-accent">{member.points}</p>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/45">Points</p>

        <button
          onClick={downloadQrCode}
          aria-label="Download QR code"
          className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center rounded-full border border-border text-foreground/60 hover:text-accent hover:border-accent"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </button>
      </div>

      <div>
        <button
          onClick={() => setShowAllHistory(!showAllHistory)}
          className="mb-3 flex w-full items-center justify-between"
        >
          <h2 className="text-lg font-bold">Points History</h2>
          <span
            className={`text-foreground/40 transition-transform ${
              showAllHistory ? "rotate-90" : ""
            }`}
          >
            &gt;
          </span>
        </button>
        <ul className="flex flex-col gap-2">
          {(showAllHistory ? pointLogs : pointLogs.slice(0, 3)).map((log) => (
            <li
              key={log.id}
              className="soft-card flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="font-medium">{log.reason}</p>
                <p className="text-sm text-foreground/60">
                  {new Date(log.created_at).toLocaleString()}
                  {log.events?.name ? ` · ${log.events.name}` : ""}
                </p>
              </div>
              <span
                className={`text-sm font-medium ${
                  log.points_delta >= 0 ? "text-primary" : "text-red-600"
                }`}
              >
                {log.points_delta >= 0 ? "+" : ""}
                {log.points_delta}
              </span>
            </li>
          ))}
          {pointLogs.length === 0 && (
            <p className="text-sm text-foreground/60">No points history yet</p>
          )}
        </ul>
      </div>
    </div>
  );
}
