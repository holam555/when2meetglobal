"use client";
import { useState } from "react";

export function ShareButton({ url, eventName }: { url: string; eventName: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: temporary input
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  async function nativeShare() {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof navigator !== "undefined" && nav.share) {
      try {
        await nav.share({
          title: eventName,
          text: `Help us pick a time for "${eventName}"`,
          url,
        });
        return;
      } catch {}
    }
    copy();
  }

  const waText = encodeURIComponent(`Help us pick a time for "${eventName}": ${url}`);

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={copy}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber text-bg rounded-md font-medium hover:bg-amber/90 transition relative"
      >
        {copied ? (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" className="animate-pop">
              <path d="M4 9l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            Copy link
          </>
        )}
      </button>
      <a
        href={`https://wa.me/?text=${waText}`}
        target="_blank"
        rel="noreferrer"
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface2 border border-border text-ink rounded-md font-medium hover:border-mute transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.893-11.893 11.893a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607z"/></svg>
        WhatsApp
      </a>
      <button
        onClick={nativeShare}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-surface2 border border-border text-ink rounded-md font-medium hover:border-mute transition sm:w-auto"
        aria-label="Share"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 4L6 7M10 12L6 9" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        Share
      </button>
    </div>
  );
}
