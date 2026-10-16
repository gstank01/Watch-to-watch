import Link from "next/link";
import { getRegion } from "@/lib/region";
import { RegionSwitcher } from "./region-switcher";

export async function SiteHeader() {
  const region = await getRegion();

  return (
    <header className="border-border bg-surface border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          What<span className="text-accent">To</span>Watch
        </Link>
        <nav aria-label="Main" className="flex flex-1 items-center gap-4 text-sm">
          <Link href="/search" className="hover:underline">
            Search
          </Link>
          <Link href="/services" className="hover:underline">
            My services
          </Link>
          <Link href="/about" className="hover:underline">
            About
          </Link>
        </nav>
        <RegionSwitcher current={region} />
      </div>
    </header>
  );
}
