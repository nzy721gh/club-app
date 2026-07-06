"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Achievement } from "@/lib/types";

export default function MePage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !member) {
      router.push("/login");
    }
  }, [loading, member, router]);

  useEffect(() => {
    if (!member) return;

    supabase
      .from("achievements")
      .select("*")
      .order("threshold", { ascending: true })
      .then(({ data }) => setAchievements(data ?? []));

    supabase
      .from("member_achievements")
      .select("achievement_id")
      .eq("member_id", member.id)
      .then(({ data }) => {
        setUnlockedIds(new Set((data ?? []).map((r) => r.achievement_id)));
      });
  }, [member]);

  if (loading || !member) {
    return <p className="text-center text-foreground/60">加载中...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 border border-border rounded-2xl p-6">
        <QRCodeSVG value={`member:${member.id}`} size={180} />
        <p className="font-semibold text-lg">{member.name}</p>
        <p className="text-3xl font-bold text-accent">{member.points}</p>
        <p className="text-sm text-foreground/60">积分</p>
      </div>

      <div>
        <h2 className="font-semibold mb-3">成就</h2>
        <ul className="flex flex-col gap-2">
          {achievements.map((a) => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <li
                key={a.id}
                className={`border border-border rounded-xl px-4 py-3 flex items-center justify-between ${
                  unlocked ? "" : "opacity-40"
                }`}
              >
                <div>
                  <p className="font-medium">{a.name}</p>
                  {a.description && (
                    <p className="text-sm text-foreground/60">
                      {a.description}
                    </p>
                  )}
                </div>
                <span className="text-sm text-primary font-medium">
                  {unlocked ? "已解锁" : `需 ${a.threshold} 分`}
                </span>
              </li>
            );
          })}
          {achievements.length === 0 && (
            <p className="text-sm text-foreground/60">暂无成就</p>
          )}
        </ul>
      </div>
    </div>
  );
}
