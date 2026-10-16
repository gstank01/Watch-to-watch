"use client";

import Link from "next/link";
import { useState } from "react";
import {
  libraryKey,
  removeTitle,
  setStatus,
  STATUS_LABELS,
  STATUSES,
  toggleFavourite,
  type LibraryTitle,
  type WatchStatus,
} from "@/lib/library/model";
import { updateLibrary, useLibrary } from "@/lib/library/store";

const toggleClass = (on: boolean, compact: boolean) =>
  `inline-flex items-center gap-1.5 rounded-lg border font-medium disabled:opacity-50 ${
    compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
  } ${on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface hover:bg-surface-2"}`;

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill={filled ? "currentColor" : "none"}>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.6 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
      />
    </svg>
  );
}

/**
 * Favourite toggle and Want to watch / Watching / Watched buttons for one title.
 * Choosing the active status again clears it.
 */
export function TitleActions({
  title,
  compact = false,
  onAnnounce,
}: {
  title: LibraryTitle;
  /** Smaller buttons plus "Remove", for the My list page. */
  compact?: boolean;
  /** Where to announce changes; by default they're shown under the buttons. */
  onAnnounce?: (message: string) => void;
}) {
  const lib = useLibrary();
  const entry = lib?.[libraryKey(title)];
  const [ownMessage, setOwnMessage] = useState("");
  const announce = onAnnounce ?? setOwnMessage;
  const ready = lib !== null;

  function chooseStatus(status: WatchStatus) {
    const clearing = entry?.status === status;
    updateLibrary((l) => setStatus(l, title, clearing ? null : status));
    announce(
      clearing
        ? `Removed ${title.title} from ${STATUS_LABELS[status]}.`
        : `Added ${title.title} to ${STATUS_LABELS[status]}.`,
    );
  }

  function flipFavourite() {
    updateLibrary((l) => toggleFavourite(l, title));
    announce(
      entry?.favourite
        ? `Removed ${title.title} from Favourites.`
        : `Added ${title.title} to Favourites.`,
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div role="group" aria-label={`${title.title}: my list`} className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!!entry?.favourite}
          disabled={!ready}
          onClick={flipFavourite}
          className={toggleClass(!!entry?.favourite, compact)}
        >
          <Heart filled={!!entry?.favourite} />
          Favourite
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={entry?.status === status}
            disabled={!ready}
            onClick={() => chooseStatus(status)}
            className={toggleClass(entry?.status === status, compact)}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
        {compact && entry && (
          <button
            type="button"
            onClick={() => {
              updateLibrary((l) => removeTitle(l, title));
              announce(`Removed ${title.title} from your list.`);
            }}
            className="text-muted px-1 text-xs underline"
          >
            Remove<span className="sr-only"> {title.title} from my list</span>
          </button>
        )}
      </div>
      {!onAnnounce && (
        <p aria-live="polite" className="text-muted text-sm">
          {ownMessage}{" "}
          {entry && (
            <Link
              href={`/my-list?list=${entry.status ?? "favourites"}`}
              className="text-accent underline"
            >
              View my list
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
