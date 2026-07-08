"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { ClubEvent, PaymentStatus } from "@/lib/types";

export default function EventsPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [myTickets, setMyTickets] = useState<Record<string, { id: string; status: PaymentStatus }>>({});
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [claimingEvent, setClaimingEvent] = useState<ClubEvent | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [paymentFiles, setPaymentFiles] = useState<File[]>([]);
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
      .select("id, event_id, payment_status")
      .eq("member_id", member.id)
      .is("guest_name", null);
    const map: Record<string, { id: string; status: PaymentStatus }> = {};
    for (const row of data ?? []) {
      map[row.event_id] = { id: row.id, status: row.payment_status };
    }
    setMyTickets(map);
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
    setPaymentFiles([]);
    setError(null);
  }

  function changeGuestCount(delta: number) {
    const max = claimingEvent?.max_guests_per_person;
    const next = Math.max(0, Math.min(max ?? Infinity, guestCount + delta));
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

    const isPaid = claimingEvent.price > 0;
    if (isPaid && paymentFiles.length === 0) {
      setError("Please upload at least one payment screenshot");
      return;
    }

    setSubmitting(true);

    const screenshotUrls: string[] = [];
    if (isPaid) {
      for (const file of paymentFiles) {
        const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
        const ext = extMatch ? extMatch[0] : ".png";
        const path = `${member.id}/${Date.now()}-${screenshotUrls.length}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file);

        if (uploadError) {
          setSubmitting(false);
          setError(uploadError.message);
          return;
        }

        screenshotUrls.push(
          supabase.storage.from("payment-proofs").getPublicUrl(path).data.publicUrl
        );
      }
    }

    const paymentFields = isPaid
      ? { payment_screenshot_urls: screenshotUrls, payment_status: "pending" as const }
      : {};

    const existing = myTickets[claimingEvent.id];
    const isRetry = existing?.status === "rejected";

    const guestRows = guestNames
      .filter((name) => name.trim())
      .map((name) => ({
        event_id: claimingEvent.id,
        member_id: member.id,
        guest_name: name.trim(),
        ...paymentFields,
      }));

    const { error } = isRetry
      ? await supabase.rpc("resubmit_payment", {
          p_ticket_id: existing.id,
          p_screenshot_urls: screenshotUrls,
        })
      : await supabase.from("tickets").insert([
          {
            event_id: claimingEvent.id,
            member_id: member.id,
            guest_name: null as string | null,
            ...paymentFields,
          },
          ...guestRows,
        ]);

    const rowCount = guestRows.length + 1;

    if (!error && guestRows.length > 0 && isRetry) {
      await supabase.from("tickets").insert(guestRows);
    }

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMyTickets({
      ...myTickets,
      [claimingEvent.id]: {
        id: existing?.id ?? "",
        status: isPaid ? "pending" : "not_required",
      },
    });
    const newlyAddedRows = isRetry ? guestRows.length : rowCount;
    setTicketCounts({
      ...ticketCounts,
      [claimingEvent.id]: (ticketCounts[claimingEvent.id] ?? 0) + newlyAddedRows,
    });
    setClaimingEvent(null);
  }

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  function claimButtonLabel(event: ClubEvent, soldOut: boolean) {
    const status = myTickets[event.id]?.status;
    if (status === "pending") return "Payment Pending Review";
    if (status === "approved" || status === "not_required") return "Ticket Claimed";
    if (status === "rejected") return "Payment Rejected — Retry";
    if (soldOut) return "Sold Out";
    return event.price > 0 ? `Get Ticket — £${event.price.toFixed(2)}` : "Get Ticket";
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Events</h1>
      <ul className="flex flex-col gap-2">
        {events.map((e) => {
          const status = myTickets[e.id]?.status;
          const claimed = ticketCounts[e.id] ?? 0;
          const soldOut = e.capacity !== null && claimed >= e.capacity;
          const disabled =
            (status !== undefined && status !== "rejected") || (soldOut && !status);
          return (
            <li
              key={e.id}
              className="border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{e.name}</p>
                <p className="text-sm text-foreground/60">
                  {new Date(e.event_time).toLocaleString()}
                  {e.end_time ? ` – ${new Date(e.end_time).toLocaleString()}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                  {e.capacity !== null ? ` · ${claimed}/${e.capacity} claimed` : ""}
                  {e.price > 0 ? ` · £${e.price.toFixed(2)}` : " · Free"}
                </p>
                {e.description && (
                  <p className="text-sm text-foreground/60 mt-1">{e.description}</p>
                )}
              </div>
              <button
                onClick={() => openClaimDialog(e)}
                disabled={disabled}
                className="shrink-0 bg-accent text-white rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                {claimButtonLabel(e, soldOut)}
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

            {claimingEvent.price > 0 && (
              <>
                <p className="text-sm text-foreground/60">
                  This event costs £{claimingEvent.price.toFixed(2)}
                  {guestCount > 0
                    ? ` per person (£${(claimingEvent.price * (guestCount + 1)).toFixed(2)} total for you + ${guestCount} guest${guestCount > 1 ? "s" : ""})`
                    : ""}
                  . Upload one or more screenshots of your payment for admin review.
                </p>
                <input
                  required
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPaymentFiles(Array.from(e.target.files ?? []))}
                  className="border border-border rounded-xl px-3 py-2 bg-background text-sm"
                />
                {paymentFiles.length > 0 && (
                  <p className="text-xs text-foreground/40">
                    {paymentFiles.length} file{paymentFiles.length > 1 ? "s" : ""} selected
                  </p>
                )}
              </>
            )}

            {claimingEvent.allow_guests && (
              <>
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
              </>
            )}

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
