"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Reward } from "@/lib/types";

export default function AdminRewardsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<
    { id: string; created_at: string; status: string; members: { name: string } | null; rewards: { name: string } | null }[]
  >([]);

  const [rewardForm, setRewardForm] = useState({ name: "", cost: 10, stock: 10 });
  const [rewardImage, setRewardImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!operator || operator.role !== "admin")) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadAll() {
    const [{ data: r }, { data: red }] = await Promise.all([
      supabase.from("rewards").select("*").order("cost", { ascending: true }),
      supabase
        .from("redemptions")
        .select("id, created_at, status, members(name), rewards(name)")
        .order("created_at", { ascending: false }),
    ]);
    setRewards(r ?? []);
    setRedemptions(
      (red as unknown as typeof redemptions | null) ?? []
    );
  }

  useEffect(() => {
    if (operator?.role === "admin") loadAll();
  }, [operator]);

  async function addReward(e: React.FormEvent) {
    e.preventDefault();
    setRewardError(null);

    let image_url: string | null = null;

    if (rewardImage) {
      setUploadingImage(true);
      const path = `${Date.now()}-${rewardImage.name}`;
      const { error: uploadError } = await supabase.storage
        .from("reward-images")
        .upload(path, rewardImage);
      setUploadingImage(false);

      if (uploadError) {
        setRewardError(uploadError.message);
        return;
      }

      image_url = supabase.storage.from("reward-images").getPublicUrl(path)
        .data.publicUrl;
    }

    const { error } = await supabase
      .from("rewards")
      .insert({ ...rewardForm, image_url });

    if (error) {
      setRewardError(error.message);
      return;
    }

    setRewardForm({ name: "", cost: 10, stock: 10 });
    setRewardImage(null);
    loadAll();
  }

  async function deleteReward(id: string) {
    await supabase.from("rewards").delete().eq("id", id);
    loadAll();
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Manage Rewards</h1>
        <form onSubmit={addReward} className="flex flex-col gap-2 border border-border rounded-xl p-4">
          <input
            required
            placeholder="Reward name"
            value={rewardForm.name}
            onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <div className="flex gap-2">
            <label className="flex-1 min-w-0 text-sm text-foreground/60">
              Cost (points)
              <input
                type="number"
                value={rewardForm.cost}
                onChange={(e) => setRewardForm({ ...rewardForm, cost: Number(e.target.value) })}
                className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
              />
            </label>
            <label className="flex-1 min-w-0 text-sm text-foreground/60">
              Stock
              <input
                type="number"
                value={rewardForm.stock}
                onChange={(e) => setRewardForm({ ...rewardForm, stock: Number(e.target.value) })}
                className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
              />
            </label>
          </div>
          <label className="text-sm text-foreground/60">
            Image (optional)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setRewardImage(e.target.files?.[0] ?? null)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background text-sm"
            />
          </label>
          <button
            disabled={uploadingImage}
            className="bg-accent text-white rounded-xl py-2 font-medium disabled:opacity-50"
          >
            {uploadingImage ? "Uploading image..." : "Add Reward"}
          </button>
          {rewardError && <p className="text-sm text-red-600">{rewardError}</p>}
        </form>
        <ul className="flex flex-col gap-2">
          {rewards.map((r) => (
            <li key={r.id} className="border border-border rounded-xl px-4 py-3 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {r.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image_url}
                    alt={r.name}
                    className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                  />
                )}
                <span className="truncate">{r.name} · {r.cost} pts · Stock {r.stock}</span>
              </div>
              <button onClick={() => deleteReward(r.id)} className="text-sm text-red-600 shrink-0">Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Redemptions</h2>
        <ul className="flex flex-col gap-2">
          {redemptions.map((red) => (
            <li
              key={red.id}
              className="border border-border rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">
                  {red.members?.name ?? "Unknown"} · {red.rewards?.name ?? "Unknown"}
                </p>
                <p className="text-sm text-foreground/60">
                  {new Date(red.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-sm text-primary font-medium">{red.status}</span>
            </li>
          ))}
          {redemptions.length === 0 && (
            <p className="text-sm text-foreground/60">No redemptions yet</p>
          )}
        </ul>
      </section>
    </div>
  );
}
