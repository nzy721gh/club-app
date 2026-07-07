"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser } from "@/lib/types";

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
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex gap-4 text-sm font-medium overflow-x-auto whitespace-nowrap">
          <Link href="/me">Me</Link>
          <Link href="/events">Events</Link>
          <Link href="/tickets">Tickets</Link>
          <Link href="/more">More</Link>
          {isAdminUser(member) && <Link href="/admin/scan">Scan</Link>}
          {isAdminUser(member) && <Link href="/admin">Admin</Link>}
        </div>
        <button
          onClick={signOut}
          className="text-sm text-foreground/60 hover:text-accent shrink-0"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
