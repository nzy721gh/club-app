"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Achievement, Reward } from "@/lib/types";

export default function AdminRewardsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [rewardForm, setRewardForm] = useState({ name: "", cost: 10, stock: 10 });
  const [achievementForm, setAchievementForm] = useState({ name: "", threshold: 10 });

  useEffect(() => {
    if (!loading && (!operator || operator.role !== "admin")) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadAll() {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from("rewards").select("*").order("cost", { ascending: true }),
      supabase
        .from("achievements")
        .select("*")
        .order("threshold", { ascending: true }),
    ]);
    setRewards(r ?? []);
    setAchievements(a ?? []);
  }

  useEffect(() => {
    if (operator?.role === "admin") loadAll();
  }, [operator]);

  async function addReward(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("rewards").insert(rewardForm);
    setRewardForm({ name: "", cost: 10, stock: 10 });
    loadAll();
  }

  async function deleteReward(id: string) {
    await supabase.from("rewards").delete().eq("id", id);
    loadAll();
  }

  async function addAchievement(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("achievements").insert(achievementForm);
    setAchievementForm({ name: "", threshold: 10 });
    loadAll();
  }

  async function deleteAchievement(id: string) {
    await supabase.from("achievements").delete().eq("id", id);
    loadAll();
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">加载中...</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">礼品管理</h2>
        <form onSubmit={addReward} className="flex flex-col gap-2 border border-border rounded-xl p-4">
          <input
            required
            placeholder="礼品名称"
            value={rewardForm.name}
            onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="所需积分"
              value={rewardForm.cost}
              onChange={(e) => setRewardForm({ ...rewardForm, cost: Number(e.target.value) })}
              className="flex-1 border border-border rounded-xl px-3 py-2 bg-background"
            />
            <input
              type="number"
              placeholder="库存"
              value={rewardForm.stock}
              onChange={(e) => setRewardForm({ ...rewardForm, stock: Number(e.target.value) })}
              className="flex-1 border border-border rounded-xl px-3 py-2 bg-background"
            />
          </div>
          <button className="bg-accent text-white rounded-xl py-2 font-medium">添加礼品</button>
        </form>
        <ul className="flex flex-col gap-2">
          {rewards.map((r) => (
            <li key={r.id} className="border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <span>{r.name} · {r.cost} 分 · 库存 {r.stock}</span>
              <button onClick={() => deleteReward(r.id)} className="text-sm text-red-600">删除</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">成就管理</h2>
        <form onSubmit={addAchievement} className="flex flex-col gap-2 border border-border rounded-xl p-4">
          <input
            required
            placeholder="成就名称"
            value={achievementForm.name}
            onChange={(e) => setAchievementForm({ ...achievementForm, name: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <input
            type="number"
            placeholder="达成所需累计积分"
            value={achievementForm.threshold}
            onChange={(e) =>
              setAchievementForm({ ...achievementForm, threshold: Number(e.target.value) })
            }
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <button className="bg-accent text-white rounded-xl py-2 font-medium">添加成就</button>
        </form>
        <ul className="flex flex-col gap-2">
          {achievements.map((a) => (
            <li key={a.id} className="border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <span>{a.name} · 需 {a.threshold} 分</span>
              <button onClick={() => deleteAchievement(a.id)} className="text-sm text-red-600">删除</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
