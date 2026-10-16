import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-border bg-surface text-muted border-t text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6">
        <p>
          Film and TV data from{" "}
          <a className="underline" href="https://www.themoviedb.org/" rel="noopener noreferrer">
            TMDB
          </a>
          . Streaming availability from{" "}
          <a className="underline" href="https://www.justwatch.com/" rel="noopener noreferrer">
            JustWatch
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p>
          WhatToWatch is free and non-commercial: no ads, no affiliate links, no tracking.{" "}
          <Link className="underline" href="/about">
            About and privacy
          </Link>
        </p>
      </div>
    </footer>
  );
}
