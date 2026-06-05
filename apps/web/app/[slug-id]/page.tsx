import { notFound, permanentRedirect } from "next/navigation";
import { getContentBySlugId } from "../../features/feed/server/service";
import { parseSlugId } from "../../lib/slug";
import { Badge } from "../../components/ui/badge";
import { ExternalLink } from "lucide-react";

type Props = { params: Promise<{ "slug-id": string }> };

export async function generateMetadata({ params }: Props) {
  const { "slug-id": slugId } = await params;
  const item = await getContentBySlugId(slugId);
  if (!item) return { title: "Not Found" };
  return {
    title: item.title,
    description: item.description ?? undefined,
    openGraph: {
      title: item.title,
      description: item.description ?? undefined,
      images: item.thumbnailUrl ? [item.thumbnailUrl] : undefined,
    },
  };
}

export default async function ContentDetailPage({ params }: Props) {
  const { "slug-id": slugId } = await params;
  const parsed = parseSlugId(slugId);
  if (!parsed) notFound();

  const item = await getContentBySlugId(slugId);
  if (!item) notFound();

  const canonicalSlugId = `${item.slug}-${item.id}`;
  if (slugId !== canonicalSlugId) {
    permanentRedirect(`/${canonicalSlugId}`);
  }

  const formattedDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(item.publishedAt));

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
          {item.type}
        </span>
        <span>{item.language.toUpperCase()}</span>
        {item.source && <span>{item.source}</span>}
        <span>{formattedDate}</span>
      </div>
      <h1 className="text-2xl font-semibold leading-tight">{item.title}</h1>
      {item.description && (
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          {item.description}
        </p>
      )}
      {item.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.categories.map((cat) => (
            <Badge key={cat.slug} variant="secondary">
              {cat.name}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-6">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
        >
          원문 보기
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
    </main>
  );
}
