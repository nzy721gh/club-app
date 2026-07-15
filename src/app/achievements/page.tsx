"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Achievement } from "@/lib/types";

export default function AchievementsPage() {
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
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Achievements</h1>
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
                {unlocked ? "Unlocked" : `Needs ${a.threshold} pts`}
              </span>
            </li>
          );
        })}
        {achievements.length === 0 && (
          <p className="text-sm text-foreground/60">No achievements yet</p>
        )}
      </ul>
    </div>
  );
}
