"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccountAndForget, signOutAndForget } from "@/lib/account/session";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={className ?? "border-border rounded-lg border px-4 py-2 font-medium"}
      onClick={async () => {
        setBusy(true);
        if (await signOutAndForget()) {
          router.push("/");
          router.refresh();
        }
        setBusy(false);
      }}
    >
      Sign out
    </button>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "deleting" | "error">("idle");

  if (step === "idle" || step === "error") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setStep("confirm")}
          className="rounded-lg border border-red-700 px-4 py-2 font-medium text-red-700 dark:border-red-400 dark:text-red-300"
        >
          Delete my account
        </button>
        {step === "error" && (
          <p role="alert" className="text-sm">
            Something went wrong and your account wasn&apos;t deleted. Please try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="delete-title"
      className="space-y-3 rounded-xl border border-red-700 p-4 dark:border-red-400"
    >
      <p id="delete-title" className="font-semibold">
        Delete your account and everything in it?
      </p>
      <p className="text-muted text-sm">
        Your list and services are removed from our servers straight away. This can&apos;t be
        undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={step === "deleting"}
          onClick={async () => {
            setStep("deleting");
            try {
              await deleteAccountAndForget();
              router.push("/?deleted=1");
              router.refresh();
            } catch {
              setStep("error");
            }
          }}
          className="rounded-lg bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {step === "deleting" ? "Deleting…" : "Yes, delete everything"}
        </button>
        <button
          type="button"
          onClick={() => setStep("idle")}
          className="border-border rounded-lg border px-4 py-2 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
