"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-prose space-y-4 py-10 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted">
        We couldn&apos;t load this page. Our film data source may be having a moment.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-accent text-accent-fg rounded-lg px-4 py-2 font-medium"
        >
          Try again
        </button>
        <Link href="/" className="border-border rounded-lg border px-4 py-2">
          Go home
        </Link>
      </div>
    </div>
  );
}
