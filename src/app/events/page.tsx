"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { ClubEvent, PaymentStatus } from "@/lib/types";

// TODO: replace with the club's real bank details
const PAYMENT_ACCOUNT = {
  name: "Account Name",
  sortCode: "12-34-56",
  accountNumber: "12345678",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center justify-between border border-border rounded-xl px-3 py-2">
      <div>
        <p className="text-xs text-foreground/60">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="text-sm text-accent font-medium shrink-0"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function EventsPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [myTickets, setMyTickets] = useState<
    Record<string, { id: string; status: PaymentStatus; guestCount: number }>
  >({});
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [claimingEvent, setClaimingEvent] = useState<ClubEvent | null>(null);
  const [mode, setMode] = useState<"new" | "edit" | "addGuest">("new");
  const [existingGuestCount, setExistingGuestCount] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [paymentFiles, setPaymentFiles] = useState<File[]>([]);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
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
      .select("id, event_id, payment_status, guest_name")
      .eq("member_id", member.id);
    const map: Record<string, { id: string; status: PaymentStatus; guestCount: number }> = {};
    for (const row of data ?? []) {
      if (row.guest_name === null) {
        const existing = map[row.event_id];
        map[row.event_id] = {
          id: row.id,
          status: row.payment_status,
          guestCount: existing?.guestCount ?? 0,
        };
      } else {
        const existing = map[row.event_id] ?? { id: "", status: "not_required" as PaymentStatus, guestCount: 0 };
        map[row.event_id] = { ...existing, guestCount: existing.guestCount + 1 };
      }
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

  async function refreshAll() {
    await Promise.all([loadTickets(), loadTicketCounts()]);
  }

  useEffect(() => {
    if (!member) return;
    loadEvents();
    refreshAll();
  }, [member]);

  async function openClaimDialog(event: ClubEvent) {
    setClaimingEvent(event);
    setPaymentFiles([]);
    setShowPaymentDetails(false);
    setExistingGuestCount(0);
    setError(null);

    const existing = myTickets[event.id];
    const editable =
      existing && (existing.status === "pending" || existing.status === "rejected");
    const canAddMore =
      existing && (existing.status === "approved" || existing.status === "not_required");

    if (editable) {
      setMode("edit");
      const { data } = await supabase
        .from("tickets")
        .select("guest_name")
        .eq("event_id", event.id)
        .eq("member_id", member!.id)
        .not("guest_name", "is", null);
      const names = (data ?? []).map((r) => r.guest_name as string);
      setGuestCount(names.length);
      setGuestNames(names);
    } else if (canAddMore) {
      setMode("addGuest");
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("member_id", member!.id)
        .not("guest_name", "is", null);
      setExistingGuestCount(count ?? 0);
      setGuestCount(0);
      setGuestNames([]);
    } else {
      setMode("new");
      setGuestCount(0);
      setGuestNames([]);
    }
  }

  function changeGuestCount(delta: number) {
    const max = claimingEvent?.max_guests_per_person;
    const remaining = max !== null && max !== undefined ? max - existingGuestCount : Infinity;
    const next = Math.max(0, Math.min(remaining, guestCount + delta));
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
    if (mode === "addGuest" && guestCount === 0) {
      setError("Add at least one guest");
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

    const guestNameList = guestNames.map((n) => n.trim()).filter(Boolean);

    let error: string | null = null;
    const paymentFields = isPaid
      ? { payment_screenshot_urls: screenshotUrls, payment_status: "pending" as const }
      : {};

    if (mode === "edit") {
      const { error: rpcError } = await supabase.rpc("update_booking", {
        p_event_id: claimingEvent.id,
        p_guest_names: guestNameList,
        p_screenshot_urls: screenshotUrls,
      });
      error = rpcError?.message ?? null;
    } else if (mode === "addGuest") {
      const rows = guestNameList.map((name) => ({
        event_id: claimingEvent.id,
        member_id: member.id,
        guest_name: name,
        ...paymentFields,
      }));
      const { error: insertError } = await supabase.from("tickets").insert(rows);
      error = insertError?.message ?? null;
    } else {
      const rows = [
        { event_id: claimingEvent.id, member_id: member.id, guest_name: null as string | null, ...paymentFields },
        ...guestNameList.map((name) => ({
          event_id: claimingEvent.id,
          member_id: member.id,
          guest_name: name,
          ...paymentFields,
        })),
      ];
      const { error: insertError } = await supabase.from("tickets").insert(rows);
      error = insertError?.message ?? null;
    }

    setSubmitting(false);

    if (error) {
      setError(error);
      return;
    }

    await refreshAll();
    setClaimingEvent(null);
  }

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  function claimButtonLabel(event: ClubEvent, soldOut: boolean) {
    const ticket = myTickets[event.id];
    const status = ticket?.status;
    const countSuffix = ticket && ticket.guestCount > 0 ? ` (1+${ticket.guestCount})` : "";
    if (status === "pending") return `Payment Pending — Edit${countSuffix}`;
    if (status === "approved" || status === "not_required") return `Ticket Claimed${countSuffix}`;
    if (status === "rejected") return `Payment Rejected — Edit & Retry${countSuffix}`;
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
            status === "approved" ||
            status === "not_required" ||
            (soldOut && !status);
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
              <div className="flex flex-col gap-1 items-end shrink-0">
                <button
                  onClick={() => openClaimDialog(e)}
                  disabled={disabled}
                  className="shrink-0 bg-accent text-white rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40"
                >
                  {claimButtonLabel(e, soldOut)}
                </button>
                {(status === "approved" || status === "not_required") &&
                  e.allow_guests &&
                  !soldOut && (
                    <button
                      onClick={() => openClaimDialog(e)}
                      className="text-xs text-accent font-medium"
                    >
                      + Add Guest
                    </button>
                  )}
              </div>
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
            <p className="font-medium">
              {mode === "edit"
                ? "Edit your submission for"
                : mode === "addGuest"
                  ? "Add guests for"
                  : "Get a ticket for"}{" "}
              &ldquo;{claimingEvent.name}&rdquo;?
            </p>

            {claimingEvent.price > 0 && (
              <>
                <p className="text-sm text-foreground/60">
                  This event costs £{claimingEvent.price.toFixed(2)} per person
                  {mode === "addGuest"
                    ? guestCount > 0
                      ? ` (£${(claimingEvent.price * guestCount).toFixed(2)} total for ${guestCount} guest${guestCount > 1 ? "s" : ""})`
                      : ""
                    : guestCount > 0
                      ? ` (£${(claimingEvent.price * (guestCount + 1)).toFixed(2)} total for you + ${guestCount} guest${guestCount > 1 ? "s" : ""})`
                      : ""}
                  . Upload one or more screenshots of your payment for admin review.
                </p>

                <button
                  type="button"
                  onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                  className="text-sm text-accent font-medium text-left"
                >
                  {showPaymentDetails ? "Hide payment details" : "Show payment details"}
                </button>

                {showPaymentDetails && (
                  <div className="flex flex-col gap-2">
                    <CopyField label="Account Name" value={PAYMENT_ACCOUNT.name} />
                    <CopyField label="Sort Code" value={PAYMENT_ACCOUNT.sortCode} />
                    <CopyField label="Account Number" value={PAYMENT_ACCOUNT.accountNumber} />
                  </div>
                )}

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
                    placeholder={`Guest name ${existingGuestCount + i + 1}`}
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
                {submitting
                  ? "Submitting..."
                  : mode === "edit"
                    ? "Save Changes"
                    : mode === "addGuest"
                      ? "Add Guests"
                      : "Confirm"}
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
