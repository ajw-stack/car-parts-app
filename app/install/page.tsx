"use client";

import { useEffect, useSyncExternalStore } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import InstallApp, { getMode, subscribe, openInChrome, type Mode } from "../components/InstallApp";

/**
 * Shareable install link: elroco.com.au/install.
 * On Android inside Messenger / Facebook / Instagram or Samsung Internet it jumps straight to
 * Chrome (where the install works); in Chrome it shows the install button; on iPhone it
 * shows the Safari steps.
 */
export default function InstallPage() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "hidden" as Mode);
  const android = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  useEffect(() => {
    if (android && (mode === "inapp" || mode === "samsung")) openInChrome();
  }, [android, mode]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <section className="bg-[#02070d] px-4 pt-12 pb-10 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Get the Elroco app</h1>
          <p className="mt-2 text-sm text-white/60">The VIN decoder on your home screen, one tap away.</p>
        </section>

        <div className="pt-10">
          {mode === "hidden" ? (
            <p className="mx-auto max-w-md px-4 text-center text-sm text-gray-600">
              Open <strong>elroco.com.au/install</strong> on your phone to add the Elroco app to your home screen.
              If you are already using the installed app, you are all set.
            </p>
          ) : (
            <InstallApp variant="card" />
          )}
          {android && (mode === "inapp" || mode === "samsung") && (
            <p className="mx-auto max-w-md px-4 pb-10 text-center text-sm text-gray-600">
              Opening Chrome… If nothing happens,{" "}
              <button onClick={openInChrome} className="font-semibold underline">tap here to open in Chrome</button>.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
