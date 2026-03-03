"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <Header />
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Login</h1>
        <p className="mt-2 text-sm text-white/70">
          Sign in to access Admin (required for adding vehicles/parts with RLS enabled).
        </p>

        <form onSubmit={signIn} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-white/70">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {msg && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-red-300">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-xs text-white/50">
            Tip: Use the Supabase user you created (Authentication → Users).
          </div>
        </form>
      </main>
    </div>
  );
}