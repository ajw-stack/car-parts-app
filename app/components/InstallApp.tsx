"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * "Install the Elroco app" button. The layout stores Chrome's beforeinstallprompt event on
 * window.__elrocoInstall (it fires before React loads); this component offers it on demand.
 * iPhone has no install API, so it shows the Share > Add to Home Screen steps instead.
 * Hidden on desktop and when the app is already installed.
 */
export type Mode = "hidden" | "prompt" | "ios" | "manual" | "inapp" | "samsung";
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type W = Window & { __elrocoInstall?: PromptEvent | null };

export function getMode(): Mode {
  if (typeof window === "undefined") return "hidden";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "hidden";
  const ua = navigator.userAgent;
  // In-app browsers (Messenger, Facebook, Instagram, TikTok, LinkedIn, Snapchat, Line, Android webviews) cannot install apps.
  if (/FBAN|FBAV|FB_IAB|Messenger|Instagram|musical_ly|TikTok|LinkedInApp|Snapchat|Line\/|; wv\)/i.test(ua)) return "inapp";
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  // Samsung Internet packages installed apps with an old Android target, which Google Play
  // Protect now blocks ("Unsafe app blocked"). Send those users to Chrome instead.
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (!/android|mobile/i.test(ua)) return "hidden";
  return (window as W).__elrocoInstall ? "prompt" : "manual";
}

export function subscribe(cb: () => void) {
  window.addEventListener("elroco-install-ready", cb);
  window.addEventListener("appinstalled", cb);
  return () => {
    window.removeEventListener("elroco-install-ready", cb);
    window.removeEventListener("appinstalled", cb);
  };
}

const isAndroid = () => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

/** Android only: reopen this site's install page in Chrome (works from Messenger, Facebook, Samsung Internet). */
export function openInChrome() {
  const fallback = encodeURIComponent(`${location.origin}/install`);
  location.href = `intent://${location.host}/install#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

export default function InstallApp({ variant }: { variant: "menu" | "card" }) {
  const mode = useSyncExternalStore(subscribe, getMode, () => "hidden" as Mode);
  const [help, setHelp] = useState(false);
  if (mode === "hidden") return null;

  async function install() {
    const evt = (window as W).__elrocoInstall;
    if (mode === "prompt" && evt) {
      await evt.prompt();
      await evt.userChoice.catch(() => null);
      (window as W).__elrocoInstall = null;
      window.dispatchEvent(new Event("elroco-install-ready"));
      return;
    }
    setHelp(true);
  }

  const steps =
    mode === "samsung"
      ? ["Samsung Internet cannot install the Elroco app on newer phones (Google Play Protect blocks it).", "Open elroco.com.au in Google Chrome and tap Install the app there.", "Or, to stay in Samsung Internet: tap ⋮ (or ≡), then Add page to, then Home screen. That adds an Elroco shortcut."]
      : mode === "inapp"
      ? ["This page is open inside another app (such as Messenger or Facebook), which cannot install apps.", "Tap the menu (⋯ or ⋮) at the top of the screen and choose Open in browser (or Open in Chrome / Safari).", "Then tap Install the app again."]
      : mode === "ios"
      ? ["Open elroco.com.au in Safari.", "Tap the Share button (the square with an arrow pointing up).", "Scroll down and tap Add to Home Screen, then Add."]
      : ["Tap the ⋮ menu at the top right of Chrome.", "Tap Install app (or Add to Home screen).", "Tap Install."];

  return (
    <>
      {variant === "menu" ? (
        <button onClick={install} className="flex w-full items-center gap-3 p-4 text-left text-white/85 hover:text-white hover:bg-[#1c2750]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
            <path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" />
          </svg>
          Install app
        </button>
      ) : (
        <div className="mx-auto max-w-3xl px-4 pb-12">
          <div className="rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-sm font-bold text-[#111827]">Get the Elroco app</h2>
              <p className="mt-1 text-sm text-gray-600">Add Elroco to your home screen and open the VIN decoder in one tap, full screen like any other app.</p>
            </div>
            <button onClick={install} className="rounded-xl bg-[#02070d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1c2750] transition-colors">
              Install the app
            </button>
          </div>
        </div>
      )}

      {help && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setHelp(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-[#111827]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Install the Elroco app</h3>
            <ol className="mt-3 space-y-2 text-sm text-gray-700 list-decimal pl-5">
              {steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <p className="mt-3 text-xs text-gray-500">The Elroco icon then appears on your home screen.</p>
            {(mode === "inapp" || mode === "samsung") && isAndroid() && (
              <button onClick={openInChrome} className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-[#111827]">
                Open in Chrome
              </button>
            )}
            <button onClick={() => setHelp(false)} className="mt-5 w-full rounded-xl bg-[#02070d] px-4 py-3 text-sm font-semibold text-white">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
