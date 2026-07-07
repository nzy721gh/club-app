"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser, type Member, type MembershipTier } from "@/lib/types";

const TIERS: MembershipTier[] = ["member", "paid", "committee"];

export default function AdminMembersPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !isAdminUser(operator)) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadMembers() {
    const { data } = await supabase
      .from("members")
      .select("*")
      .order("name", { ascending: true });
    setMembers(data ?? []);
  }

  useEffect(() => {
    if (isAdminUser(operator)) loadMembers();
  }, [operator]);

  async function setTier(id: string, tier: MembershipTier) {
    await supabase.from("members").update({ membership_tier: tier }).eq("id", id);
    setMembers(members.map((m) => (m.id === id ? { ...m, membership_tier: tier } : m)));
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="text-sm text-foreground/60 hover:text-accent">
        &larr; Back to Admin
      </Link>
      <h1 className="text-xl font-semibold">Manage Members</h1>
      <input
        placeholder="Search by name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-border rounded-xl px-3 py-2 bg-background"
      />
      <ul className="flex flex-col gap-2">
        {filtered.map((m) => (
          <li
            key={m.id}
            className="border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{m.name}</p>
              <p className="text-sm text-foreground/60">{m.points} pts</p>
            </div>
            <select
              value={m.membership_tier}
              onChange={(e) => setTier(m.id, e.target.value as MembershipTier)}
              className="border border-border rounded-xl px-2 py-1 bg-background text-sm shrink-0"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-foreground/60">No members found</p>
        )}
      </ul>
    </div>
  );
}
