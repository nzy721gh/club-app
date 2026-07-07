"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { ClubEvent } from "@/lib/types";

export default function AdminEventsPage() {
  const { member: operator, loading } = useMember();
  const router = useRouter();

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    event_time: "",
  });

  useEffect(() => {
    if (!loading && (!operator || operator.role !== "admin")) {
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
    if (operator?.role === "admin") loadEvents();
  }, [operator]);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("events").insert({
      ...form,
      event_time: new Date(form.event_time).toISOString(),
    });
    setForm({ name: "", description: "", location: "", event_time: "" });
    loadEvents();
  }

  async function deleteEvent(id: string) {
    await supabase.from("events").delete().eq("id", id);
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
        <form onSubmit={addEvent} className="flex flex-col gap-2 border border-border rounded-xl p-4">
          <input
            required
            placeholder="Event name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
          <label className="text-sm text-foreground/60">
            Date and time
            <input
              required
              type="datetime-local"
              value={form.event_time}
              onChange={(e) => setForm({ ...form, event_time: e.target.value })}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
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
          <button className="bg-accent text-white rounded-xl py-2 font-medium">Add Event</button>
        </form>
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id} className="border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-foreground/60">
                  {new Date(e.event_time).toLocaleString()}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </div>
              <button onClick={() => deleteEvent(e.id)} className="text-sm text-red-600">Delete</button>
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
