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

  useEffect(() => {
    if (!loading && !member) router.push("/login");
  }, [loading, member, router]);

  useEffect(() => {
    if (!member) return;
    supabase
      .from("events")
      .select("*")
      .order("event_time", { ascending: true })
      .then(({ data }) => setEvents(data ?? []));
  }, [member]);

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Events</h1>
      <ul className="flex flex-col gap-2">
        {events.map((e) => (
          <li key={e.id} className="border border-border rounded-xl px-4 py-3">
            <p className="font-medium">{e.name}</p>
            <p className="text-sm text-foreground/60">
              {new Date(e.event_time).toLocaleString()}
              {e.location ? ` · ${e.location}` : ""}
            </p>
            {e.description && (
              <p className="text-sm text-foreground/60 mt-1">{e.description}</p>
            )}
          </li>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-foreground/60">No events yet</p>
        )}
      </ul>
    </div>
  );
}
