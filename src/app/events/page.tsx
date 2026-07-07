"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { ClubEvent } from "@/lib/types";

export default function EventsPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [ticketedEventIds, setTicketedEventIds] = useState<Set<string>>(new Set());
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [claimingEvent, setClaimingEvent] = useState<ClubEvent | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !member) router.push("/login");
  }, [loading, member, router]);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_time", { ascending: true });
    setEvents(data ?? []);
  }

  async function loadTickets() {
    if (!member) return;
    const { data } = await supabase
      .from("tickets")
      .select("event_id")
      .eq("member_id", member.id)
      .is("guest_name", null);
    setTicketedEventIds(new Set((data ?? []).map((t) => t.event_id)));
  }

  async function loadTicketCounts() {
    const { data } = await supabase.rpc("get_event_ticket_counts");
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.event_id] = Number(row.ticket_count);
    }
    setTicketCounts(counts);
  }

  useEffect(() => {
    if (!member) return;
    loadEvents();
    loadTickets();
    loadTicketCounts();
  }, [member]);

  function openClaimDialog(event: ClubEvent) {
    setClaimingEvent(event);
    setGuestCount(0);
    setGuestNames([]);
    setError(null);
  }

  function changeGuestCount(delta: number) {
    const next = Math.max(0, guestCount + delta);
    setGuestCount(next);
    setGuestNames((names) => {
      const updated = names.slice(0, next);
      while (updated.length < next) updated.push("");
      return updated;
    });
  }

  async function confirmClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !claimingEvent) return;
    setError(null);
    setSubmitting(true);

    const rows = [{ event_id: claimingEvent.id, member_id: member.id, guest_name: null as string | null }];
    for (const name of guestNames) {
      if (name.trim()) {
        rows.push({ event_id: claimingEvent.id, member_id: member.id, guest_name: name.trim() });
      }
    }

    const { error } = await supabase.from("tickets").insert(rows);

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setTicketedEventIds(new Set([...ticketedEventIds, claimingEvent.id]));
    setTicketCounts({
      ...ticketCounts,
      [claimingEvent.id]: (ticketCounts[claimingEvent.id] ?? 0) + rows.length,
    });
    setClaimingEvent(null);
  }

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Events</h1>
      <ul className="flex flex-col gap-2">
        {events.map((e) => {
          const hasTicket = ticketedEventIds.has(e.id);
          const claimed = ticketCounts[e.id] ?? 0;
          const soldOut = e.capacity !== null && claimed >= e.capacity;
          return (
            <li
              key={e.id}
              className="border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{e.name}</p>
                <p className="text-sm text-foreground/60">
                  {new Date(e.event_time).toLocaleString()}
                  {e.location ? ` · ${e.location}` : ""}
                  {e.capacity !== null ? ` · ${claimed}/${e.capacity} claimed` : ""}
                </p>
                {e.description && (
                  <p className="text-sm text-foreground/60 mt-1">{e.description}</p>
                )}
              </div>
              <button
                onClick={() => openClaimDialog(e)}
                disabled={hasTicket || soldOut}
                className="shrink-0 bg-accent text-white rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                {hasTicket ? "Ticket Claimed" : soldOut ? "Sold Out" : "Get Ticket"}
              </button>
            </li>
          );
        })}
        {events.length === 0 && (
          <p className="text-sm text-foreground/60">No events yet</p>
        )}
      </ul>

      {claimingEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20">
          <form
            onSubmit={confirmClaim}
            className="bg-background border border-border rounded-2xl p-5 flex flex-col gap-3 max-w-sm w-full"
          >
            <p className="font-medium">Get a ticket for &ldquo;{claimingEvent.name}&rdquo;?</p>

            <div className="text-sm text-foreground/60">
              Guests
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => changeGuestCount(-1)}
                  className="w-10 h-10 shrink-0 border border-border rounded-xl text-lg font-semibold"
                >
                  &minus;
                </button>
                <span className="flex-1 text-center text-lg font-semibold text-foreground">
                  {guestCount}
                </span>
                <button
                  type="button"
                  onClick={() => changeGuestCount(1)}
                  className="w-10 h-10 shrink-0 border border-border rounded-xl text-lg font-semibold"
                >
                  +
                </button>
              </div>
            </div>

            {guestNames.map((name, i) => (
              <input
                key={i}
                required
                placeholder={`Guest name ${i + 1}`}
                value={name}
                onChange={(e) =>
                  setGuestNames((names) =>
                    names.map((n, idx) => (idx === i ? e.target.value : n))
                  )
                }
                className="border border-border rounded-xl px-3 py-2 bg-background"
              />
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-accent text-white rounded-xl py-2 font-medium disabled:opacity-50"
              >
                {submitting ? "Claiming..." : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setClaimingEvent(null)}
                className="flex-1 border border-border rounded-xl py-2 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
