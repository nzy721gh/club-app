"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import { isAdminUser, type ClubEvent } from "@/lib/types";

const EMPTY_FORM = { name: "", description: "", location: "", event_time: "" };

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
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      event_time: new Date(form.event_time).toISOString(),
    };

    if (editingId) {
      await supabase.from("events").update(payload).eq("id", editingId);
    } else {
      await supabase.from("events").insert(payload);
    }

    setEditingId(null);
    setForm(EMPTY_FORM);
    loadEvents();
  }

  async function deleteEvent(id: string) {
    await supabase.from("events").delete().eq("id", id);
    if (editingId === id) cancelEdit();
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
          <input
            required
            type="datetime-local"
            value={form.event_time}
            onChange={(e) => setForm({ ...form, event_time: e.target.value })}
            className="w-full min-w-0 border border-border rounded-xl px-3 py-2 bg-background"
          />
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
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => startEdit(e)} className="text-sm text-accent">Edit</button>
                <button onClick={() => deleteEvent(e.id)} className="text-sm text-red-600">Delete</button>
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-foreground/60">No events yet</p>
          )}
        </ul>
      </section>
    </div>
  );
}
