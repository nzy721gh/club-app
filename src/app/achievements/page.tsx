"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ALLOWED_EMAIL_DOMAIN = "gmail.com";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      mode === "signup" &&
      !email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
    ) {
      setError(`Only @${ALLOWED_EMAIL_DOMAIN} emails are allowed to sign up`);
      return;
    }

    setLoading(true);

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, student_id: studentId } },
          });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/me");
  }

  return (
    <div className="flex flex-col gap-6 pt-10">
      <h1 className="text-xl font-semibold">
        {mode === "signin" ? "Sign In" : "Sign Up"} to Your Club Account
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
        )}

        <input
          required
          placeholder="Kent ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 bg-background"
        />

        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 bg-background"
        />

        <input
          required
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 bg-background"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white rounded-xl py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Processing..." : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-sm text-foreground/60"
      >
        {mode === "signin"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
