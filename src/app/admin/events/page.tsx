"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser, type ClubEvent } from "@/lib/types";

const EMPTY_FORM = {
  name: "",
  description: "",
  location: "",
  event_time: "",
  end_time: "",
  capacity: "",
  allowGuests: false,
  maxGuestsPerPerson: 0,
  price: "",
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminEventsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<ClubEvent | null>(null);

  useEffect(() => {
    if (!loading && !isAdminUser(operator)) {
      router.push("/me");
    }
  }, [loading, operator, router]);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_time", { ascending: true });
    setEvents(data ?? []);
  }

  useEffect(() => {
    if (isAdminUser(operator)) loadEvents();
  }, [operator]);

  function startEdit(event: ClubEvent) {
    setEditingId(event.id);
    setForm({
      name: event.name,
      description: event.description ?? "",
      location: event.location ?? "",
      event_time: toLocalInputValue(event.event_time),
      end_time: event.end_time ? toLocalInputValue(event.end_time) : "",
      capacity: event.capacity !== null ? String(event.capacity) : "",
      allowGuests: event.allow_guests,
      maxGuestsPerPerson: event.max_guests_per_person ?? 0,
      price: event.price > 0 ? String(event.price) : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      description: form.description,
      location: form.location,
      event_time: new Date(form.event_time).toISOString(),
      end_time: form.end_time === "" ? null : new Date(form.end_time).toISOString(),
      capacity: form.capacity === "" ? null : Number(form.capacity),
      allow_guests: form.allowGuests,
      max_guests_per_person:
        form.allowGuests && form.maxGuestsPerPerson > 0 ? form.maxGuestsPerPerson : null,
      price: form.price === "" ? 0 : Number(form.price),
    };

    const { error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert(payload);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingId(null);
    setForm(EMPTY_FORM);
    loadEvents();
  }

  async function confirmDeleteEvent() {
    if (!deletingEvent) return;
    setError(null);
    const { error } = await supabase.from("events").delete().eq("id", deletingEvent.id);
    if (error) {
      setError(error.message);
      setDeletingEvent(null);
      return;
    }
    if (editingId === deletingEvent.id) cancelEdit();
    setDeletingEvent(null);
    loadEvents();
  }

  if (loading || !operator) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="text-sm text-foreground/60 hover:text-accent">
        &larr; Back to Admin
      </Link>
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Manage Events</h1>
        <form onSubmit={saveEvent} className="flex flex-col gap-2 border border-border rounded-xl p-4">
          <input
            required
            placeholder="Event name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <label className="text-sm text-foreground/60">
            Start time
            <input
              required
              type="datetime-local"
              value={form.event_time}
              onChange={(e) => setForm({ ...form, event_time: e.target.value })}
              className="mt-1 w-full min-w-0 border border-border rounded-xl px-3 py-2 bg-background"
            />
          </label>
          <label className="text-sm text-foreground/60">
            End time
            <input
              required
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="mt-1 w-full min-w-0 border border-border rounded-xl px-3 py-2 bg-background"
            />
          </label>
          <input
            placeholder="Location (optional)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <input
            type="number"
            min="0"
            placeholder="Capacity (optional, leave blank for unlimited)"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price in £ (optional, leave blank for free)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <label className="flex items-center gap-2 text-sm text-foreground/60">
            <input
              type="checkbox"
              checked={form.allowGuests}
              onChange={(e) => setForm({ ...form, allowGuests: e.target.checked })}
            />
            Allow guests
          </label>
          {form.allowGuests && (
            <div className="text-sm text-foreground/60">
              Max guests per person
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      maxGuestsPerPerson: Math.max(0, form.maxGuestsPerPerson - 1),
                    })
                  }
                  className="w-10 h-10 shrink-0 border border-border rounded-xl text-lg font-semibold"
                >
                  &minus;
                </button>
                <span className="flex-1 text-center text-lg font-semibold text-foreground">
                  {form.maxGuestsPerPerson === 0 ? "Unlimited" : form.maxGuestsPerPerson}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, maxGuestsPerPerson: form.maxGuestsPerPerson + 1 })
                  }
                  className="w-10 h-10 shrink-0 border border-border rounded-xl text-lg font-semibold"
                >
                  +
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button className="flex-1 bg-accent text-white rounded-xl py-2 font-medium">
              {editingId ? "Save Changes" : "Add Event"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 border border-border rounded-xl py-2 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id} className="border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{e.name}</p>
                <p className="text-sm text-foreground/60">
                  {new Date(e.event_time).toLocaleString()}
                  {e.end_time ? ` – ${new Date(e.end_time).toLocaleString()}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                  {e.capacity !== null ? ` · Capacity ${e.capacity}` : ""}
                  {e.allow_guests
                    ? ` · Guests allowed${
                        e.max_guests_per_person !== null
                          ? ` (max ${e.max_guests_per_person})`
                          : ""
                      }`
                    : ""}
                  {e.price > 0 ? ` · £${e.price.toFixed(2)}` : " · Free"}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => startEdit(e)} className="text-sm text-accent">Edit</button>
                <button onClick={() => setDeletingEvent(e)} className="text-sm text-red-600">Delete</button>
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-foreground/60">No events yet</p>
          )}
        </ul>
      </section>

      {deletingEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20">
          <div className="bg-background border border-border rounded-2xl p-5 flex flex-col gap-3 max-w-sm w-full">
            <p className="font-medium">
              Delete &ldquo;{deletingEvent.name}&rdquo;?
            </p>
            <p className="text-sm text-foreground/60">
              This cannot be undone. Any tickets for this event will also be deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDeleteEvent}
                className="flex-1 bg-red-600 text-white rounded-xl py-2 font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeletingEvent(null)}
                className="flex-1 border border-border rounded-xl py-2 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
