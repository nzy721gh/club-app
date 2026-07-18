"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";



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
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6">
      <div className="page-header text-center">
        <p className="eyebrow">Welcome back</p>
        <h1 className="page-title">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="page-subtitle">Track points, claim tickets, unlock achievements, and redeem club rewards.</p>
      </div>

      <form onSubmit={handleSubmit} className="surface-card flex flex-col gap-3 p-5 sm:p-6">
        {mode === "signup" && (
          <>
            <input
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
            <input
              required
              placeholder="Kent ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="form-input"
            />
          </>
        )}
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
        />
        <input
          required
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="primary-button"
        >
          {loading ? "Processing..." : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-sm font-medium text-foreground/60 transition hover:text-accent"
      >
        {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
