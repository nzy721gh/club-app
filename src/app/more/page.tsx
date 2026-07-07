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
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">More</h1>
      <Link
        href="/rewards"
        className="border border-border rounded-xl px-4 py-3 flex items-center justify-between font-medium hover:border-accent"
      >
        Rewards
        <span className="text-foreground/40">&rarr;</span>
      </Link>
      <Link
        href="/achievements"
        className="border border-border rounded-xl px-4 py-3 flex items-center justify-between font-medium hover:border-accent"
      >
        Achievements
        <span className="text-foreground/40">&rarr;</span>
      </Link>
    </div>
  );
}
