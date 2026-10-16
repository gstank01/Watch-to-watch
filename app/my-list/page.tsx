import type { Metadata } from "next";
import { MyList } from "@/components/my-list";
import { isListKey } from "@/lib/library/model";

export const metadata: Metadata = { title: "My list" };

export default async function MyListPage(props: PageProps<"/my-list">) {
  const raw = (await props.searchParams).list;
  const list = isListKey(raw) ? raw : "want";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">My list</h1>
        <p className="text-muted max-w-prose">
          Your favourites and what you want to watch, are watching and have watched. Saved in this
          browser only — we never see it.
        </p>
      </header>
      <MyList list={list} />
    </div>
  );
}
