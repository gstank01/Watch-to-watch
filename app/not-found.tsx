import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose space-y-4 py-10 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-muted">We couldn&apos;t find that page or title.</p>
      <Link href="/search" className="text-accent underline">
        Search for something else
      </Link>
    </div>
  );
}
