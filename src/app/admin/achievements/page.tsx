"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser, type Achievement } from "@/lib/types";

export default function AdminAchievementsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementForm, setAchievementForm] = useState({ name: "", threshold: 10 });

  useEffect(() => {
    if (!loading && !isAdminUser(operator)) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadAchievements() {
    const { data } = await supabase
      .from("achievements")
      .select("*")
      .order("threshold", { ascending: true });
    setAchievements(data ?? []);
  }

  useEffect(() => {
    if (isAdminUser(operator)) loadAchievements();
  }, [operator]);

  async function addAchievement(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("achievements").insert(achievementForm);
    setAchievementForm({ name: "", threshold: 10 });
    loadAchievements();
  }

  async function deleteAchievement(id: string) {
    await supabase.from("achievements").delete().eq("id", id);
    loadAchievements();
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="text-sm text-foreground/60 hover:text-accent">
        &larr; Back to Admin
      </Link>
      <section className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Manage Achievements</h1>
      <form onSubmit={addAchievement} className="flex flex-col gap-2 border border-border rounded-xl p-4">
        <input
          required
          placeholder="Achievement name"
          value={achievementForm.name}
          onChange={(e) => setAchievementForm({ ...achievementForm, name: e.target.value })}
          className="border border-border rounded-xl px-3 py-2 bg-background"
        />
        <label className="text-sm text-foreground/60">
          Points required to unlock
          <input
            type="number"
            value={achievementForm.threshold}
            onChange={(e) =>
              setAchievementForm({ ...achievementForm, threshold: Number(e.target.value) })
            }
            className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
          />
        </label>
        <button className="bg-accent text-white rounded-xl py-2 font-medium">Add Achievement</button>
      </form>
      <ul className="flex flex-col gap-2">
        {achievements.map((a) => (
          <li key={a.id} className="border border-border rounded-xl px-4 py-3 flex items-center justify-between">
            <span>{a.name} · Needs {a.threshold} pts</span>
            <button onClick={() => deleteAchievement(a.id)} className="text-sm text-red-600">Delete</button>
          </li>
        ))}
        {achievements.length === 0 && (
          <p className="text-sm text-foreground/60">No achievements yet</p>
        )}
      </ul>
      </section>
    </div>
  );
}
