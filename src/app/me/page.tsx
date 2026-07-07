"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { PointLog } from "@/lib/types";

export default function MePage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);

  useEffect(() => {
    if (!loading && !member) {
      router.push("/login");
    }
  }, [loading, member, router]);

  useEffect(() => {
    if (!member) return;

    supabase
      .from("point_logs")
      .select("*")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPointLogs(data ?? []));
  }, [member]);

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <Link
          href="/settings"
          className="text-sm text-foreground/60 hover:text-accent"
        >
          Settings
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3 border border-border rounded-2xl p-6">
        {member.is_paid && (
          <span className="bg-accent text-white text-sm font-bold tracking-wide px-4 py-1.5 rounded-full shadow">
            PAID MEMBER
          </span>
        )}
        <QRCodeSVG value={`member:${member.id}`} size={180} />
        <p className="font-semibold text-lg">{member.name}</p>
        <p className="text-3xl font-bold text-accent">{member.points}</p>
        <p className="text-sm text-foreground/60">Points</p>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Points History</h2>
        <ul className="flex flex-col gap-2">
          {pointLogs.map((log) => (
            <li
              key={log.id}
              className="border border-border rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{log.reason}</p>
                <p className="text-sm text-foreground/60">
                  {new Date(log.created_at).toLocaleString()}
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
