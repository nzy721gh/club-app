"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Member } from "./types";

export function useMember() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMember(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setMember(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [load]);

  return { member, loading, refresh: load };
}
