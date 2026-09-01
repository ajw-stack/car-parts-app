"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function CaptureLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInErr || !data.session) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    // Check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();

    if (profile?.role !== "capture" && profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account does not have capture access.");
      setLoading(false);
      return;
    }

    router.replace("/capture");
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-4">
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset;
          -webkit-text-fill-color: #111111;
          caret-color: #111111;
        }
      `}</style>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/logos/elroco-block-red-sm.png"
            alt="Elroco"
            className="h-9 mx-auto mb-6"
          />
          <h1 className="text-xl font-bold text-white">Capture login</h1>
          <p className="mt-1 text-sm text-zinc-500">Field capture access only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-[#D1D5DB] bg-white px-4 py-4 text-base text-[#111111] placeholder:text-zinc-400 focus:border-[#CC0000] focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="w-full rounded-2xl border border-[#D1D5DB] bg-white px-4 py-4 text-base text-[#111111] placeholder:text-zinc-400 focus:border-[#CC0000] focus:outline-none"
          />

          {error && (
            <p className="rounded-xl bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#CC0000] text-white font-bold text-base disabled:opacity-40 active:bg-[#aa0000] transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
