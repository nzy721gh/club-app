"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";

export default function SettingsPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !member) {
      router.push("/login");
    }
  }, [loading, member, router]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function redeemCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const { error } = await supabase.rpc("redeem_reference_code", {
      p_code: code,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setCode("");
    window.location.reload();
  }

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="border border-border rounded-xl p-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Name</span>
          <span>{member.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Email</span>
          <span>{email ?? "-"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Kent ID</span>
          <span>{member.student_id ?? "-"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Points</span>
          <span>{member.points}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Membership</span>
          <span className={member.membership_tier !== "member" ? "text-primary font-medium" : ""}>
            {member.membership_tier === "committee"
              ? "Committee"
              : member.membership_tier === "paid"
                ? "Paid Member"
                : "Free Member"}
          </span>
        </div>
      </div>

      {member.membership_tier === "member" && (
        <form
          onSubmit={redeemCode}
          className="border border-border rounded-xl p-4 flex flex-col gap-2"
        >
          <h2 className="font-semibold text-sm">Become a Paid Member</h2>
          <label className="text-sm text-foreground/60">
            Reference Code
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-primary">Membership verified!</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="bg-accent text-white rounded-xl py-2 font-medium disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}
