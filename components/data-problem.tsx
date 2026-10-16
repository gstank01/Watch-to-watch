/** Shown in place of content when TMDB data can't be loaded. */
export function DataProblem({ message }: { message: string }) {
  return (
    <p role="status" className="border-border bg-surface text-muted rounded-lg border p-4">
      {message}
    </p>
  );
}
