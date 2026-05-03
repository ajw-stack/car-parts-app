"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${location.origin}/garage` },
    });
    setLoading(false);

    if (err) { setError(err.message); return; }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#141414]">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Save vehicles and find compatible parts instantly.
            </p>
          </div>

          {done ? (
            <div className="rounded-2xl border border-emerald-800 bg-emerald-900/20 px-6 py-8 text-center space-y-3">
              <p className="text-lg font-semibold text-white">Check your email</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                We&apos;ve sent a confirmation link to <span className="text-white">{email}</span>.
                Click it to activate your account and you&apos;re good to go.
              </p>
              <a
                href="/login"
                className="mt-2 inline-block text-sm text-[#E8000D] hover:underline"
              >
                Back to Sign In
              </a>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#E8000D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#E8000D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#E8000D] focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password || !confirm}
                className="w-full rounded-xl bg-[#E8000D] px-4 py-3 text-sm font-semibold text-white hover:bg-[#9a0101] disabled:opacity-40 transition-colors"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>

              <p className="text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <a href="/login" className="text-white hover:text-[#E8000D] transition-colors">
                  Sign in
                </a>
              </p>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
