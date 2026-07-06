"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";

export default function NavBar() {
  const { member } = useMember();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!member) return null;

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-10">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex gap-4 text-sm font-medium">
          <Link href="/me">我的</Link>
          <Link href="/rewards">礼品</Link>
          {member.role === "admin" && <Link href="/admin/scan">扫码</Link>}
          {member.role === "admin" && <Link href="/admin/rewards">管理</Link>}
        </div>
        <button
          onClick={signOut}
          className="text-sm text-foreground/60 hover:text-accent"
        >
          退出
        </button>
      </div>
    </nav>
  );
}
