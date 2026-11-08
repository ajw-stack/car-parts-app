"use client";

import { useState } from "react";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";
import PasswordInput from "../components/PasswordInput";

export default function SignupPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);
  const [exists, setExists]     = useState(false);

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
    setExists(false);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${location.origin}/pricing` },
    });
    setLoading(false);

    if (err) { setError(err.message); return; }
    // Supabase answers a sign-up for an already-registered email with a user that has no
    // identities and sends no email. Say so, instead of "check your email".
    if (data.user && (data.user.identities?.length ?? 0) === 0) { setExists(true); return; }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black">Create your account</h1>
            <p className="mt-2 text-sm text-gray-600">
              Create an account to start using the Elroco VIN Decoder.
            </p>
          </div>

          {exists ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center space-y-3">
              <p className="text-lg font-semibold text-amber-800">You already have an account</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold text-black">{email.trim()}</span> is already registered. Sign in with your
                existing password, or reset it if you have forgotten it.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <a href="/login" className="rounded-xl bg-[#02070d] px-4 py-3 text-sm font-semibold text-white">Sign in</a>
                <a href="/forgot-password" className="text-sm font-medium text-black hover:text-[#CC0000]">Reset my password</a>
              </div>
            </div>
          ) : done ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center space-y-3">
              <p className="text-lg font-semibold text-emerald-800">Check your email</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                We&apos;ve sent a confirmation link to <span className="font-semibold text-black">{email}</span>.
                Click it to activate your account and you&apos;re good to go.
              </p>
              <a
                href="/login"
                className="mt-2 inline-block text-sm font-medium text-black hover:text-[#CC0000]"
              >
                Back to Sign In
              </a>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-[#02070d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Password
                </label>
                <PasswordInput
                  iconClassName="text-gray-400 hover:text-gray-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-[#02070d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <PasswordInput
                  iconClassName="text-gray-400 hover:text-gray-700"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-[#02070d] focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password || !confirm}
                className="w-full rounded-xl bg-[#02070d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c2750] disabled:opacity-40 transition-colors"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <a href="/login" className="font-medium text-black hover:text-[#CC0000] transition-colors">
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
