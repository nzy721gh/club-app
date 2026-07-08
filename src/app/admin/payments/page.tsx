"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser, type PaymentStatus } from "@/lib/types";

type PendingTicket = {
  id: string;
  guest_name: string | null;
  payment_screenshot_url: string | null;
  payment_status: PaymentStatus;
  created_at: string;
  members: { name: string } | null;
  events: { name: string; price: number } | null;
};

export default function AdminPaymentsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!loading && !isAdminUser(operator)) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadTickets() {
    let query = supabase
      .from("tickets")
      .select("id, guest_name, payment_screenshot_url, payment_status, created_at, members(name), events(name, price)")
      .not("payment_screenshot_url", "is", null)
      .order("created_at", { ascending: false });

    if (!showAll) {
      query = query.eq("payment_status", "pending");
    }

    const { data } = await query;
    setTickets((data as unknown as PendingTicket[]) ?? []);
  }

  useEffect(() => {
    if (isAdminUser(operator)) loadTickets();
  }, [operator, showAll]);

  async function setStatus(id: string, status: "approved" | "rejected") {
    await supabase.from("tickets").update({ payment_status: status }).eq("id", id);
    loadTickets();
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="text-sm text-foreground/60 hover:text-accent">
        &larr; Back to Admin
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Review Payments</h1>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-accent"
        >
          {showAll ? "Show pending only" : "Show all"}
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {tickets.map((t) => (
          <li key={t.id} className="border border-border rounded-xl p-4 flex flex-col gap-3">
            {t.payment_screenshot_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.payment_screenshot_url}
                alt="Payment screenshot"
                className="w-full max-h-80 object-contain rounded-xl border border-border"
              />
            )}
            <div className="text-sm">
              <p className="font-medium">
                {t.members?.name}
                {t.guest_name ? ` (guest: ${t.guest_name})` : ""}
              </p>
              <p className="text-foreground/60">
                {t.events?.name} · £{t.events?.price?.toFixed(2)}
              </p>
              <p className="text-foreground/60">
                {new Date(t.created_at).toLocaleString()}
              </p>
              <p
                className={`font-medium ${
                  t.payment_status === "approved"
                    ? "text-primary"
                    : t.payment_status === "rejected"
                      ? "text-red-600"
                      : "text-accent"
                }`}
              >
                {t.payment_status.toUpperCase()}
              </p>
            </div>
            {t.payment_status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus(t.id, "approved")}
                  className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => setStatus(t.id, "rejected")}
                  className="flex-1 border border-border rounded-xl py-2 text-sm font-medium text-red-600"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
        {tickets.length === 0 && (
          <p className="text-sm text-foreground/60">No payments to review</p>
        )}
      </ul>
    </div>
  );
}
