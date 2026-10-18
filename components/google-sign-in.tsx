"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

/** Google's "G" mark, as its sign-in branding guidelines require. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

type StartError = { status?: number; code?: string; message?: string };

/** Says why sign-in didn't start, so the visitor (or site owner) knows what to do. */
export function explainStartError(err: StartError, siteOrigin: string, pageOrigin: string) {
  if (err.code === "INVALID_ORIGIN") {
    return `Sign-in only works at the site's main address, ${siteOrigin}, but this page is at ${pageOrigin}. Open the main address and try again. (Site owner: check AUTH_URL.)`;
  }
  if (err.status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (!err.status) return "We couldn't reach our server. Check your connection and try again.";
  const detail = [err.code ?? err.status, err.message].filter(Boolean).join(": ");
  return `Sign-in couldn't start (${detail}). Please try again.`;
}

export function GoogleSignIn({ siteOrigin }: { siteOrigin: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          // On success this navigates away to Google.
          const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/my-list",
            newUserCallbackURL: "/my-list",
            // Better Auth appends its own `error` parameter to this.
            errorCallbackURL: "/sign-in?failed=google",
          });
          if (error) {
            setError(explainStartError(error, siteOrigin, window.location.origin));
            setBusy(false);
          }
        }}
        className="border-border inline-flex items-center gap-3 rounded-lg border bg-white px-4 py-2 font-medium text-[#1f1f1f] hover:bg-[#f8f8f8] disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
