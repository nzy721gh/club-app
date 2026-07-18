"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser } from "@/lib/types";

const primaryLinks = [
  { href: "/me", label: "Me" },
  { href: "/events", label: "Events" },
  { href: "/tickets", label: "Tickets" },
  { href: "/more", label: "More" },
];

export default function NavBar() {
  const { member } = useMember();
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!member) return null;

  const links = isAdminUser(member)
    ? [...primaryLinks, { href: "/admin/scan", label: "Scan" }, { href: "/admin", label: "Admin" }]
    : primaryLinks;

  return (
    <nav className="sticky top-0 z-10 border-b border-white/70 bg-background/85 shadow-sm shadow-black/5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/me" className="shrink-0 text-sm font-extrabold tracking-tight text-foreground">
          Club<span className="text-accent">Points</span>
        </Link>
        <div className="no-scrollbar flex gap-1 overflow-x-auto whitespace-nowrap rounded-full border border-border/80 bg-white/55 p-1 text-sm font-semibold shadow-inner">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 transition ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-foreground/65 hover:bg-white hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={signOut}
          className="shrink-0 rounded-full border border-border/80 bg-white/55 px-3 py-1.5 text-sm font-semibold text-foreground/70 transition hover:border-accent/60 hover:text-accent"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
