"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Reward } from "@/lib/types";

export default function RewardsPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !member) router.push("/login");
  }, [loading, member, router]);

  async function loadRewards() {
    const { data } = await supabase
      .from("rewards")
      .select("*")
      .order("cost", { ascending: true });
    setRewards(data ?? []);
  }

  useEffect(() => {
    if (member) loadRewards();
  }, [member]);

  async function redeem(reward: Reward) {
    if (!member) return;
    setMessage(null);
    setRedeemingId(reward.id);

    const { error } = await supabase.rpc("redeem_reward", {
      p_reward_id: reward.id,
      p_member_id: member.id,
    });

    setRedeemingId(null);

    if (error) {
      setMessage(`兑换失败：${error.message}`);
      return;
    }

    setMessage(`已成功兑换「${reward.name}」`);
    loadRewards();
  }

  if (loading || !member) {
    return <p className="text-center text-foreground/60">加载中...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">礼品兑换</h1>
        <p className="text-sm text-foreground/60">
          我的积分：<span className="text-accent font-semibold">{member.points}</span>
        </p>
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}

      <ul className="flex flex-col gap-3">
        {rewards.map((r) => {
          const canAfford = member.points >= r.cost && r.stock > 0;
          return (
            <li
              key={r.id}
              className="border border-border rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium">{r.name}</p>
                {r.description && (
                  <p className="text-sm text-foreground/60">{r.description}</p>
                )}
                <p className="text-sm text-foreground/60">
                  {r.cost} 分 · 库存 {r.stock}
                </p>
              </div>
              <button
                onClick={() => redeem(r)}
                disabled={!canAfford || redeemingId === r.id}
                className="bg-accent text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                {redeemingId === r.id ? "兑换中..." : "兑换"}
              </button>
            </li>
          );
        })}
        {rewards.length === 0 && (
          <p className="text-sm text-foreground/60">暂无礼品</p>
        )}
      </ul>
    </div>
  );
}
