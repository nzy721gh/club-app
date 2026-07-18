"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "@/lib/use-member";
import { isAdminUser } from "@/lib/types";

export default function AdminPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdminUser(operator)) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <p className="eyebrow">Club hub</p>
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Manage the club experience from one clear control panel.</p>
      </div>
      <Link
        href="/admin/events"
        className="soft-card flex items-center justify-between px-5 py-4 font-bold transition hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-lg"
      >
        Manage Events
        <span className="text-foreground/40">&rarr;</span>
      </Link>
      <Link
        href="/admin/payments"
        className="soft-card flex items-center justify-between px-5 py-4 font-bold transition hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-lg"
      >
        Review Payments
        <span className="text-foreground/40">&rarr;</span>
      </Link>
      <Link
        href="/admin/rewards"
        className="soft-card flex items-center justify-between px-5 py-4 font-bold transition hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-lg"
      >
        Manage Rewards
        <span className="text-foreground/40">&rarr;</span>
      </Link>
      <Link
        href="/admin/achievements"
        className="soft-card flex items-center justify-between px-5 py-4 font-bold transition hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-lg"
      >
        Manage Achievements
        <span className="text-foreground/40">&rarr;</span>
      </Link>
      <Link
        href="/admin/members"
        className="soft-card flex items-center justify-between px-5 py-4 font-bold transition hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-lg"
      >
        Manage Members
        <span className="text-foreground/40">&rarr;</span>
      </Link>
    </div>
  );
}
