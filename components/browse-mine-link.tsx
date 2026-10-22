"use client";

import Link from "next/link";
import { browseHref, WHERE, type BrowseState } from "@/lib/browse";
import { useMyServices } from "@/lib/services/store";
import { chipClass } from "./browse-chips";

/**
 * "On my services": the services live in this browser, so the link is built
 * here and carries them in the URL for the server.
 */
export function BrowseMineLink({ state }: { state: BrowseState }) {
  const services = useMyServices();
  const active = state.where === "mine";
  if (services !== null && services.length === 0) {
    return (
      <Link href="/services" className={chipClass(false)}>
        {WHERE.mine}: pick your services first
      </Link>
    );
  }
  return (
    <Link
      href={browseHref(state, { where: "mine", services: services ?? state.services })}
      aria-current={active ? "page" : undefined}
      className={chipClass(active)}
    >
      {WHERE.mine}
    </Link>
  );
}
