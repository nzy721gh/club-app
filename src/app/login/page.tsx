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
      setError(`仅允许使用 @${ALLOWED_EMAIL_DOMAIN} 邮箱注册`);
      return;
    }

    setLoading(true);

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
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
        {mode === "signin" ? "登录" : "注册"}社团账号
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            required
            placeholder="姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 bg-background"
          />
        )}
        <input
          required
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 bg-background"
        />
        <input
          required
          type="password"
          placeholder="密码"
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
          {loading ? "处理中..." : mode === "signin" ? "登录" : "注册"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-sm text-foreground/60"
      >
        {mode === "signin" ? "没有账号？去注册" : "已有账号？去登录"}
      </button>
    </div>
  );
}
