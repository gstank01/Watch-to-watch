import type { Metadata } from "next";

export const metadata: Metadata = { title: "About and privacy" };

export default function AboutPage() {
  return (
    <div className="max-w-prose space-y-8 leading-relaxed">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">About WhatToWatch</h1>
        <p>
          WhatToWatch helps you find something to watch across every streaming service. It puts the
          services you already pay for first, then free options like BBC iPlayer, ITVX and Channel
          4, before suggesting anything you&apos;d have to pay for.
        </p>
        <p>
          It&apos;s free and non-commercial. There are no ads, no affiliate links and no tracking.
          We don&apos;t sign you up to anything or handle payments: &ldquo;Watch on&rdquo; buttons
          just take you to where the title is listed.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="credits">
        <h2 id="credits" className="text-xl font-semibold">
          Where our data comes from
        </h2>
        <p>
          Film and TV information comes from{" "}
          <a
            className="text-accent underline"
            href="https://www.themoviedb.org/"
            rel="noopener noreferrer"
          >
            The Movie Database (TMDB)
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p>
          Streaming availability is provided by{" "}
          <a
            className="text-accent underline"
            href="https://www.justwatch.com/"
            rel="noopener noreferrer"
          >
            JustWatch
          </a>{" "}
          through TMDB. It can take a day or two to reflect changes.
        </p>
        <p>
          Which services count as free is curated by hand in our{" "}
          <code className="bg-surface-2 rounded px-1">data/free-services.yaml</code> file. Spotted a
          mistake? Corrections are welcome as pull requests.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="privacy">
        <h2 id="privacy" className="text-xl font-semibold">
          Privacy, in plain English
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Without an account, your services and your list (favourites, want to watch, watching,
            watched) are saved in your browser only. We never receive them.
          </li>
          <li>
            With an account, we store your email address, your services and your list, so they
            follow you to other devices. We use your email only to sign you in. If you sign in with
            Google, Google tells us your email address and nothing else: not your name, photo or
            contacts. We don&apos;t record your IP address or browser.
          </li>
          <li>
            Signing in sets one cookie to keep you signed in. Signing out removes your list from
            that browser.
          </li>
          <li>
            You can delete your account at any time in Account settings. Everything is deleted
            immediately; we keep nothing.
          </li>
          <li>We remember your country in a cookie so pages show the right services.</li>
          <li>No analytics, advertising or tracking cookies. Ever.</li>
          <li>We never ask for or store your streaming passwords.</li>
          <li>
            Searches are sent to TMDB to find titles. TMDB doesn&apos;t receive anything that
            identifies you.
          </li>
        </ul>
      </section>
    </div>
  );
}
