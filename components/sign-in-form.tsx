"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type State =
  { step: "form"; error?: string } | { step: "sending" } | { step: "sent"; email: string };

export function SignInForm({ expiresInMinutes }: { expiresInMinutes: number }) {
  const [state, setState] = useState<State>({ step: "form" });

  if (state.step === "sent") {
    return (
      <div role="status" className="border-accent bg-accent-soft space-y-2 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p>
          We&apos;ve sent a sign-in link to <strong>{state.email}</strong>. It works once and
          expires in {expiresInMinutes} minutes.
        </p>
        <p className="text-muted text-sm">
          Nothing arrived? Check your spam folder, or{" "}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => setState({ step: "form" })}
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
        setState({ step: "sending" });
        const { error } = await authClient.signIn.magicLink({
          email,
          callbackURL: "/my-list",
          newUserCallbackURL: "/my-list",
          // Better Auth appends its own `error` parameter to this.
          errorCallbackURL: "/sign-in?link=invalid",
        });
        if (!error) return setState({ step: "sent", email });
        setState({
          step: "form",
          error:
            error.status === 429
              ? "Too many attempts. Please wait a minute and try again."
              : "We couldn't send the email. Check the address and try again.",
        });
      }}
    >
      <label className="block space-y-1">
        <span className="block font-medium">Email address</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="border-border bg-surface w-full max-w-md rounded-xl border px-4 py-2"
          aria-describedby={state.step === "form" && state.error ? "sign-in-error" : undefined}
        />
      </label>
      {state.step === "form" && state.error && (
        <p id="sign-in-error" role="alert" className="text-sm font-medium">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={state.step === "sending"}
        className="bg-accent text-accent-fg rounded-lg px-4 py-2 font-medium hover:opacity-90 disabled:opacity-60"
      >
        {state.step === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
