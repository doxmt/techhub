import { BookOpen, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FeedItem } from "@/features/feed/server/service";

type Props = {
  item: FeedItem;
};

export function ContentCard({ item }: Props) {
  const detailUrl = `/${item.slug}-${item.id}`;
  const formattedDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(item.publishedAt));

  return (
    <a
      href={detailUrl}
      className="block rounded-md border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      <article className="flex flex-col gap-3 md:flex-row md:items-start">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="h-24 w-40 shrink-0 rounded object-cover"
          />
        ) : (
          <div
            data-testid="thumbnail-placeholder"
            className="h-24 w-40 shrink-0 rounded bg-neutral-100 dark:bg-neutral-800"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
              {item.type === "article" ? (
                <BookOpen className="size-3" aria-hidden="true" />
              ) : (
                <Play className="size-3" aria-hidden="true" />
              )}
              {item.type}
            </span>
            <span>{item.language}</span>
            {item.source && <span>{item.source}</span>}
            <span>{formattedDate}</span>
          </div>
          <h2 className="text-base font-semibold leading-snug">{item.title}</h2>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">
              {item.description}
            </p>
          )}
          {item.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.categories.map((cat) => (
                <Badge key={cat.slug} variant="secondary" className="text-xs">
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </article>
    </a>
  );
}
