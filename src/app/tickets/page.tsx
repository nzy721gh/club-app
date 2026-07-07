"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Ticket } from "@/lib/types";

type TicketWithEvent = Ticket & {
  events: {
    name: string;
    location: string | null;
    event_time: string;
    end_time: string | null;
  } | null;
};

type Category = "valid" | "expired" | "used";

function getCategory(t: TicketWithEvent): Category {
  if (t.status === "used") return "used";
  const endTime = t.events?.end_time ?? t.events?.event_time;
  if (endTime && new Date(endTime) < new Date()) return "expired";
  return "valid";
}

const CATEGORY_LABELS: Record<Category, string> = {
  valid: "Valid",
  expired: "Expired",
  used: "Used",
};

function TicketCard({
  ticket,
  holderName,
  category,
}: {
  ticket: TicketWithEvent;
  holderName: string;
  category: Category;
}) {
  async function share() {
    const text = `${ticket.events?.name ?? "Event"} ticket for ${holderName}${
      ticket.events?.event_time
        ? ` — ${new Date(ticket.events.event_time).toLocaleString()}`
        : ""
    }`;

    if (navigator.share) {
      try {
        await navigator.share({ title: ticket.events?.name ?? "Ticket", text });
      } catch {
        // user cancelled the share sheet, nothing to do
      }
      return;
    }

    await navigator.clipboard.writeText(text);
  }

  return (
    <div
      className={`snap-center shrink-0 w-full relative rounded-2xl border border-border overflow-hidden bg-background ${
        category !== "valid" ? "opacity-50" : ""
      }`}
    >
      <div className="p-5 flex flex-col items-center gap-1 text-center">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full mb-1 ${
            category === "valid" ? "bg-primary text-white" : "bg-border text-foreground/60"
          }`}
        >
          {CATEGORY_LABELS[category].toUpperCase()}
        </span>
        <p className="font-semibold text-lg">{ticket.events?.name}</p>
        <p className="text-sm text-foreground/60">{holderName}</p>
        <p className="text-sm text-foreground/60">
          {ticket.events?.event_time
            ? new Date(ticket.events.event_time).toLocaleString()
            : ""}
          {ticket.events?.location ? ` · ${ticket.events.location}` : ""}
        </p>
      </div>

      <div className="relative border-t border-dashed border-border">
        <span className="absolute -left-3 top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border" />
        <span className="absolute -right-3 top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border" />
        <div className="p-5 flex flex-col items-center gap-3">
          <QRCodeSVG value={`ticket:${ticket.id}`} size={150} />
          <button
            onClick={share}
            className="text-sm text-accent font-medium border border-border rounded-xl px-4 py-1.5"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

function groupByEvent(tickets: TicketWithEvent[]) {
  const groups = new Map<string, TicketWithEvent[]>();
  for (const t of tickets) {
    const existing = groups.get(t.event_id) ?? [];
    existing.push(t);
    groups.set(t.event_id, existing);
  }
  return [...groups.values()];
}

export default function TicketsPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);

  useEffect(() => {
    if (!loading && !member) router.push("/login");
  }, [loading, member, router]);

  useEffect(() => {
    if (!member) return;
    supabase
      .from("tickets")
      .select("*, events(name, location, event_time, end_time)")
      .eq("member_id", member.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setTickets((data as unknown as TicketWithEvent[]) ?? []));
  }, [member]);

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  const categories: Category[] = ["valid", "expired", "used"];
  const byCategory: Record<Category, TicketWithEvent[]> = {
    valid: [],
    expired: [],
    used: [],
  };
  for (const t of tickets) {
    byCategory[getCategory(t)].push(t);
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">My Tickets</h1>
      {categories.map((category) => {
        const groups = groupByEvent(byCategory[category]);
        if (groups.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-4">
            <h2 className="font-semibold text-sm text-foreground/60">
              {CATEGORY_LABELS[category]}
            </h2>
            {groups.map((group) => (
              <div key={group[0].event_id} className="flex flex-col gap-2">
                {group.length > 1 && (
                  <p className="text-xs text-foreground/40 text-center">
                    Swipe to see guest ticket &rarr;
                  </p>
                )}
                <div className="no-scrollbar flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4">
                  {group.map((t) => (
                    <TicketCard
                      key={t.id}
                      ticket={t}
                      category={category}
                      holderName={t.guest_name ? `${t.guest_name} (Guest)` : member.name}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      {tickets.length === 0 && (
        <p className="text-sm text-foreground/60">
          No tickets yet. Get one from the Events page.
        </p>
      )}
    </div>
  );
}
