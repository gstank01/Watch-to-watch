import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadTitle, parseId, TitlePage } from "@/components/title-page";

export async function generateMetadata(props: PageProps<"/tv/[id]">): Promise<Metadata> {
  const id = parseId((await props.params).id);
  if (!id) return {};
  try {
    const info = await loadTitle("tv", id);
    return { title: info.year ? `${info.title} (${info.year})` : info.title };
  } catch {
    return {};
  }
}

export default async function Page(props: PageProps<"/tv/[id]">) {
  const id = parseId((await props.params).id);
  if (!id) notFound();
  return <TitlePage mediaType="tv" id={id} />;
}
