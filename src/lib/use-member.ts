"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Member } from "./types";

export function useMember() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (active) {
          setMember(null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (active) {
        setMember(data ?? null);
        setLoading(false);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { member, loading };
}
