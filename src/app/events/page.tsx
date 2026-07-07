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
  const [claimingId, setClaimingId] = useState<string | null>(null);
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
      .eq("member_id", member.id);
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

  async function getTicket(eventId: string) {
    if (!member) return;
    setError(null);
    setClaimingId(eventId);

    const { error } = await supabase.from("tickets").insert({
      event_id: eventId,
      member_id: member.id,
    });

    setClaimingId(null);

    if (error) {
      setError(error.message);
      return;
    }

    setTicketedEventIds(new Set([...ticketedEventIds, eventId]));
    setTicketCounts({ ...ticketCounts, [eventId]: (ticketCounts[eventId] ?? 0) + 1 });
  }

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Events</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
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
                onClick={() => getTicket(e.id)}
                disabled={hasTicket || soldOut || claimingId === e.id}
                className="shrink-0 bg-accent text-white rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                {hasTicket
                  ? "Ticket Claimed"
                  : soldOut
                    ? "Sold Out"
                    : claimingId === e.id
                      ? "Claiming..."
                      : "Get Ticket"}
              </button>
            </li>
          );
        })}
        {events.length === 0 && (
          <p className="text-sm text-foreground/60">No events yet</p>
        )}
      </ul>
    </div>
  );
}
