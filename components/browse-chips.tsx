import Link from "next/link";

export const chipClass = (active: boolean) =>
  `inline-block rounded-full border px-3 py-1.5 text-sm ${
    active
      ? "border-accent bg-accent text-accent-fg font-medium"
      : "border-border bg-surface hover:bg-surface-2"
  }`;

/** A labelled row of filter links; the chosen one is marked as the current page. */
export function ChipGroup({
  label,
  options,
  extra,
}: {
  label: string;
  options: { key: string; label: string; href: string; active: boolean }[];
  extra?: React.ReactNode;
}) {
  const id = `filter-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div role="group" aria-labelledby={id} className="space-y-2">
      <p id={id} className="text-muted text-sm font-medium">
        {label}
      </p>
      <ul className="flex flex-wrap gap-2">
        {options.map((o) => (
          <li key={o.key}>
            <Link
              href={o.href}
              aria-current={o.active ? "page" : undefined}
              className={chipClass(o.active)}
            >
              {o.label}
            </Link>
          </li>
        ))}
        {extra && <li>{extra}</li>}
      </ul>
    </div>
  );
}
