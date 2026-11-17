"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * "Install app" button. Uses the browser's install prompt where available
 * (Android, desktop Chrome/Edge) and shows Add to Home Screen steps elsewhere
 * (iPhone/iPad Safari). Which app gets installed depends on the page's manifest:
 * the public site or the separate admin app.
 */
export function InstallAppButton({
  label = "Install the PAHAD app",
  className,
  apk,
  apkClassName,
}: {
  label?: string;
  className?: string;
  /** Android app file (APK) to offer as a direct download. */
  apk?: string;
  apkClassName?: string;
}) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const sync = () => {
      setReady(Boolean(deferred));
      setInstalled(isStandalone());
    };
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      setReady(false);
    } else {
      setHelp(true);
    }
  }

  return (
    <>
      <button type="button" onClick={install} className={cn("inline-flex items-center justify-center gap-2", className)} data-ready={ready || undefined}>
        <Download className="h-4 w-4" aria-hidden /> {label}
      </button>
      {apk && (
        <a href={apk} download className={cn("mt-2 block text-xs underline underline-offset-2 opacity-80 hover:opacity-100", apkClassName)}>
          Or download the Android app (APK)
        </a>
      )}
      {help && (
        <div role="dialog" aria-modal="true" aria-labelledby="install-title" className="fixed inset-0 z-[80] flex items-end justify-center bg-teal-950/60 p-4 sm:items-center" onClick={() => setHelp(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-ink shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 id="install-title" className="font-display text-xl text-teal">{label}</h2>
              <button type="button" onClick={() => setHelp(false)} aria-label="Close" className="rounded-full p-1 text-muted hover:bg-sand">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted">Add it to your home screen to open it like an app.</p>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-semibold text-teal">iPhone / iPad:</span>
                <span>
                  In Safari tap <Share className="inline h-4 w-4" aria-label="Share" />, then <strong>Add to Home Screen</strong>{" "}
                  <SquarePlus className="inline h-4 w-4" aria-hidden />.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-teal">Android:</span>
                <span>
                  In Chrome tap the menu ⋮, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  {apk && (
                    <>
                      {" "}Or <a href={apk} download className="font-semibold text-teal underline">download the Android app</a>.
                    </>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-teal">Computer:</span>
                <span>In Chrome or Edge, click the install icon at the right of the address bar.</span>
              </li>
            </ol>
            <button type="button" onClick={() => setHelp(false)} className="btn btn-primary mt-6 w-full">Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
