"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "@/lib/use-member";

export default function AdminPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!operator || operator.role !== "admin")) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <Link
        href="/admin/events"
        className="border border-border rounded-xl px-4 py-3 flex items-center justify-between font-medium hover:border-accent"
      >
        Manage Events
        <span className="text-foreground/40">&rarr;</span>
      </Link>
      <Link
        href="/admin/rewards"
        className="border border-border rounded-xl px-4 py-3 flex items-center justify-between font-medium hover:border-accent"
      >
        Manage Rewards
        <span className="text-foreground/40">&rarr;</span>
      </Link>
      <Link
        href="/admin/achievements"
        className="border border-border rounded-xl px-4 py-3 flex items-center justify-between font-medium hover:border-accent"
      >
        Manage Achievements
        <span className="text-foreground/40">&rarr;</span>
      </Link>
    </div>
  );
}
