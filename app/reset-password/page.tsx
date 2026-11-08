"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import PasswordInput from "../components/PasswordInput";
import { supabase } from "../lib/supabaseClient";

type Stage = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The emailed link signs the user in with a one-time recovery session, which the Supabase
  // client reads from the URL. Without that session the link has expired or was already used.
  useEffect(() => {
    let settled = false;
    // Branded email links point here with ?token_hash=...&type=recovery (same domain as the sender).
    const tokenHash = new URLSearchParams(location.search).get("token_hash");
    if (tokenHash) {
      settled = true;
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
        setStage(error ? "invalid" : "ready");
      });
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && !settled)) {
        settled = true;
        setStage("ready");
      }
    });
    const timer = setTimeout(async () => {
      if (settled) return;
      const { data } = await supabase.auth.getSession();
      settled = true;
      setStage(data.session ? "ready" : "invalid");
    }, 1500);
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("The two passwords do not match."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStage("done");
  }

  async function continueOn() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { location.href = "/login"; return; }
    const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    location.href = data?.role === "admin" ? "/admin" : data?.role === "capture" ? "/capture" : "/account";
  }

  const field =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-[#CC0000] focus:outline-none";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black">Set a new password</h1>
          </div>

          {stage === "checking" && <p className="text-center text-sm text-gray-500">Checking your link…</p>}

          {stage === "invalid" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                This reset link has expired or has already been used. Request a new one.
              </div>
              <p className="text-center text-sm">
                <a href="/forgot-password" className="text-black hover:text-[#CC0000] font-medium">Send a new reset link</a>
              </p>
            </div>
          )}

          {stage === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">New password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Min. 6 characters"
                  className={field}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Confirm new password</label>
                <PasswordInput
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter password"
                  className={field}
                />
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full rounded-xl bg-[#02070d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c2750] disabled:opacity-40 transition-colors"
              >
                {loading ? "Saving…" : "Save new password"}
              </button>
            </form>
          )}

          {stage === "done" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Your password has been changed and you are signed in.
              </div>
              <button
                onClick={continueOn}
                className="w-full rounded-xl bg-[#02070d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c2750] transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
