"use client";

import { useId, useState } from "react";
import { libraryKey, MAX_RATING, setRating, type LibraryTitle } from "@/lib/library/model";
import { updateLibrary, useLibrary } from "@/lib/library/store";

const STARS = Array.from({ length: MAX_RATING }, (_, i) => i + 1);

function Star({ filled, small }: { filled: boolean; small: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={small ? "size-5" : "size-7"}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6-4.5-4.2 6.1-.8z" />
    </svg>
  );
}

/**
 * The visitor's own 1-5 star rating for a title. Native radio buttons, so arrow
 * keys and screen readers ("4 stars, selected") work as usual.
 */
export function StarRating({
  title,
  compact = false,
  onAnnounce,
}: {
  title: LibraryTitle;
  /** Small stars and no visible heading, for My list cards. */
  compact?: boolean;
  onAnnounce?: (message: string) => void;
}) {
  const lib = useLibrary();
  const rating = lib?.[libraryKey(title)]?.rating ?? null;
  const name = useId();
  const [ownMessage, setOwnMessage] = useState("");
  const announce = onAnnounce ?? setOwnMessage;

  function rate(value: number | null) {
    updateLibrary((l) => setRating(l, title, value));
    announce(
      value === null
        ? `Cleared your rating for ${title.title}.`
        : `Rated ${title.title} ${value} star${value === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div className={compact ? "" : "space-y-1"}>
      <fieldset disabled={lib === null} className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <legend className={compact ? "sr-only" : "mb-1 text-sm font-medium"}>
          Your rating<span className="sr-only"> for {title.title}</span>
        </legend>
        <div className="text-accent flex items-center">
          {STARS.map((n) => (
            <label key={n} className="relative cursor-pointer p-0.5">
              {/* Invisible but laid over the star, so a click on the star is a click on it. */}
              <input
                type="radio"
                name={name}
                value={n}
                checked={rating === n}
                onChange={() => rate(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span className="peer-focus-visible:outline-accent block rounded peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                <Star filled={rating !== null && n <= rating} small={compact} />
              </span>
            </label>
          ))}
        </div>
        {rating !== null && (
          <button
            type="button"
            onClick={() => rate(null)}
            className={`text-muted underline ${compact ? "text-xs" : "text-sm"}`}
          >
            Clear<span className="sr-only"> your rating for {title.title}</span>
          </button>
        )}
      </fieldset>
      {!onAnnounce && (
        <p aria-live="polite" className="text-muted min-h-5 text-sm">
          {ownMessage}
        </p>
      )}
    </div>
  );
}
