import Link from "next/link";
import { getSessionUser } from "@/lib/auth/server";
import { accountsStatus } from "@/lib/auth/status";
import { getRegion } from "@/lib/region";
import { RegionSwitcher } from "./region-switcher";

export async function SiteHeader() {
  const region = await getRegion();
  const accounts = accountsStatus().enabled;
  const user = accounts ? await getSessionUser() : null;

  return (
    <header className="border-border bg-surface border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          What<span className="text-accent">To</span>Watch
        </Link>
        <nav
          aria-label="Main"
          className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm whitespace-nowrap"
        >
          <Link href="/search" className="hover:underline">
            Search
          </Link>
          <Link href="/my-list" className="hover:underline">
            My list
          </Link>
          <Link href="/services" className="hover:underline">
            My services
          </Link>
          <Link href="/about" className="hover:underline">
            About
          </Link>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <Link href="/settings" className="hover:underline">
              Account
            </Link>
          ) : (
            accounts && (
              <Link href="/sign-in" className="text-accent font-medium hover:underline">
                Sign in
              </Link>
            )
          )}
          <RegionSwitcher current={region} />
        </div>
      </div>
    </header>
  );
}
