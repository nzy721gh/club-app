"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser, type PaymentStatus } from "@/lib/types";

type TicketRow = {
  id: string;
  guest_name: string | null;
  payment_screenshot_urls: string[] | null;
  payment_status: PaymentStatus;
  created_at: string;
  event_id: string;
  member_id: string;
  members: { name: string } | null;
  events: { name: string; price: number } | null;
};

type Booking = {
  key: string;
  primary: TicketRow;
  guestCount: number;
  allIds: string[];
};

function groupIntoBookings(rows: TicketRow[]): Booking[] {
  const groups = new Map<string, TicketRow[]>();
  for (const row of rows) {
    const key = `${row.event_id}-${row.member_id}`;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  const bookings: Booking[] = [];
  for (const [key, rows] of groups) {
    const primary = rows.find((r) => !r.guest_name);
    if (!primary || !primary.payment_screenshot_urls) continue;
    bookings.push({
      key,
      primary,
      guestCount: rows.filter((r) => r.guest_name).length,
      allIds: rows.map((r) => r.id),
    });
  }
  return bookings.sort(
    (a, b) => new Date(b.primary.created_at).getTime() - new Date(a.primary.created_at).getTime()
  );
}

export default function AdminPaymentsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!loading && !isAdminUser(operator)) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadBookings() {
    const { data } = await supabase
      .from("tickets")
      .select(
        "id, guest_name, payment_screenshot_urls, payment_status, created_at, event_id, member_id, members(name), events(name, price)"
      )
      .order("created_at", { ascending: false });

    const rows = (data as unknown as TicketRow[]) ?? [];
    const grouped = groupIntoBookings(rows);
    setBookings(showAll ? grouped : grouped.filter((b) => b.primary.payment_status === "pending"));
  }

  useEffect(() => {
    if (isAdminUser(operator)) loadBookings();
  }, [operator, showAll]);

  async function setStatus(booking: Booking, status: "approved" | "rejected") {
    await supabase.from("tickets").update({ payment_status: status }).in("id", booking.allIds);
    loadBookings();
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
        <button onClick={() => setShowAll(!showAll)} className="text-sm text-accent">
          {showAll ? "Show pending only" : "Show all"}
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {bookings.map((b) => {
          const totalGuests = b.guestCount;
          const price = b.primary.events?.price ?? 0;
          const total = price * (totalGuests + 1);
          return (
            <li key={b.key} className="border border-border rounded-xl p-4 flex flex-col gap-3">
              {b.primary.payment_screenshot_urls && b.primary.payment_screenshot_urls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {b.primary.payment_screenshot_urls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt="Payment screenshot"
                      className="max-h-80 w-auto shrink-0 object-contain rounded-xl border border-border"
                    />
                  ))}
                </div>
              )}
              <div className="text-sm">
                <p className="font-medium">
                  {b.primary.members?.name}
                  {totalGuests > 0 ? ` (${totalGuests} guest${totalGuests > 1 ? "s" : ""})` : ""}
                </p>
                <p className="text-foreground/60">
                  {b.primary.events?.name} · £{total.toFixed(2)} total
                </p>
                <p className="text-foreground/60">
                  {new Date(b.primary.created_at).toLocaleString()}
                </p>
                <p
                  className={`font-medium ${
                    b.primary.payment_status === "approved"
                      ? "text-primary"
                      : b.primary.payment_status === "rejected"
                        ? "text-red-600"
                        : "text-accent"
                  }`}
                >
                  {b.primary.payment_status.toUpperCase()}
                </p>
              </div>
              {b.primary.payment_status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus(b, "approved")}
                    className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(b, "rejected")}
                    className="flex-1 border border-border rounded-xl py-2 text-sm font-medium text-red-600"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {bookings.length === 0 && (
          <p className="text-sm text-foreground/60">No payments to review</p>
        )}
      </ul>
    </div>
  );
}
