"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "@/lib/use-member";

export default function Home() {
  const { member, loading } = useMember();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(member ? "/me" : "/login");
  }, [loading, member, router]);

  return null;
}
