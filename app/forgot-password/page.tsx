"use client";

import { useState } from "react";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/reset-password`,
    });
    setLoading(false);
    // Rate limits are worth reporting; anything else gets the same neutral message so the
    // page never reveals whether an email address has an account.
    if (err && /rate|limit|seconds/i.test(err.message)) {
      setError("Too many requests. Please wait a minute and try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black">Reset your password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. Check your inbox
                and spam folder. The link works once.
              </div>
              <p className="text-center text-sm text-gray-600">
                <a href="/login" className="text-black hover:text-[#CC0000] font-medium">Back to sign in</a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-[#CC0000] focus:outline-none"
                />
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-xl bg-[#02070d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c2750] disabled:opacity-40 transition-colors"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <p className="text-center text-sm text-gray-600">
                <a href="/login" className="text-black hover:text-[#CC0000] font-medium">Back to sign in</a>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
