"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "@/lib/use-member";

export default function MorePage() {
  const { member, loading } = useMember();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !member) {
      router.push("/login");
    }
  }, [loading, member, router]);

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <p className="eyebrow">Club hub</p>
        <h1 className="page-title">More</h1>
        <p className="page-subtitle">Explore rewards, achievements, and extra tools for your club account.</p>
      </div>
      <Link
        href="/rewards"
        className="soft-card flex items-center justify-between px-5 py-4 font-bold transition hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-lg"
      >
        Rewards
        <span className="text-foreground/40">&rarr;</span>
      </Link>
      <Link
        href="/achievements"
        className="soft-card flex items-center justify-between px-5 py-4 font-bold transition hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-lg"
      >
        Achievements
        <span className="text-foreground/40">&rarr;</span>
      </Link>
    </div>
  );
}
