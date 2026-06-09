import { Eye, ThumbsUp } from "lucide-react";
import type { FeedItem } from "@/features/feed/server/service";
import { cn } from "@/lib/utils";
import { ContentActions } from "./content-actions";
import { ThumbnailImage } from "./thumbnail-image";

type Props = {
  item: FeedItem;
  variant?: "list" | "grid";
  onPreview?: (item: FeedItem) => void;
  isLoggedIn?: boolean;
};

function formatDate(value: string) {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join(".");
}

export function ContentCard({
  item,
  variant = "list",
  onPreview,
  isLoggedIn = false,
}: Props) {
  const isPreviewEnabled = Boolean(onPreview);
  const typeLabel = item.type === "article" ? "아티클" : "영상";
  const formattedDate = formatDate(item.publishedAt);

  function openPreview() {
    onPreview?.(item);
  }

  return (
    <article
      role={isPreviewEnabled ? "button" : undefined}
      tabIndex={isPreviewEnabled ? 0 : undefined}
      onClick={isPreviewEnabled ? openPreview : undefined}
      onKeyDown={
        isPreviewEnabled
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPreview();
              }
            }
          : undefined
      }
      className={cn(
        "group flex h-full flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4 transition-all duration-200 hover:scale-[1.02] hover:border-teal-400/60 hover:bg-neutral-50 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-teal-500/50 dark:hover:bg-neutral-800/80 dark:hover:shadow-teal-900/20",
        variant === "grid" && "h-full",
        variant === "list" && "sm:flex-row sm:items-stretch",
        isPreviewEnabled &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
      )}
    >
      <div
        className={cn(
          "relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded",
          variant === "list" && "sm:h-32 sm:w-56"
        )}
      >
        {isPreviewEnabled ? (
          <div className="block h-full w-full" aria-hidden="true">
            {item.thumbnailUrl ? (
              <ThumbnailImage
                src={item.thumbnailUrl}
                alt=""
                source={item.source ?? ""}
              />
            ) : (
              <div
                data-testid="thumbnail-placeholder"
                className="flex h-full w-full items-center justify-center bg-neutral-900"
              >
                <span className="text-sm font-semibold text-neutral-600">
                  {item.source}
                </span>
              </div>
            )}
          </div>
        ) : (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.title} 원문 보기`}
            className="block h-full w-full"
          >
            {item.thumbnailUrl ? (
              <ThumbnailImage
                src={item.thumbnailUrl}
                alt={item.title ?? ""}
                source={item.source ?? ""}
              />
            ) : (
              <div
                data-testid="thumbnail-placeholder"
                className="flex h-full w-full items-center justify-center bg-neutral-900"
              >
                <span className="text-sm font-semibold text-neutral-600">
                  {item.source}
                </span>
              </div>
            )}
          </a>
        )}
        {variant === "grid" && (
          <ContentActions
            contentId={Number(item.id)}
            isBookmarked={item.isBookmarked ?? false}
            isLiked={item.isLiked ?? false}
            isLoggedIn={isLoggedIn}
            variant="grid"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h2
            className={cn(
              "min-w-0 flex-1 break-words text-base font-semibold leading-snug text-neutral-950 dark:text-neutral-50",
              variant === "grid"
                ? "line-clamp-2 min-h-[2.75rem]"
                : "line-clamp-1"
            )}
          >
            {isPreviewEnabled ? (
              <span>{item.title}</span>
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-teal-700 dark:hover:text-teal-300"
              >
                {item.title}
              </a>
            )}
          </h2>
          {variant === "list" && (
            <ContentActions
              contentId={Number(item.id)}
              isBookmarked={item.isBookmarked ?? false}
              isLiked={item.isLiked ?? false}
              isLoggedIn={isLoggedIn}
              variant="list"
            />
          )}
        </div>

        <p
          className={cn(
            "mt-1 text-sm leading-5 text-neutral-600 dark:text-neutral-300",
            variant === "grid" ? "line-clamp-3 min-h-[3.75rem]" : "line-clamp-2"
          )}
        >
          {item.description ?? ""}
        </p>

        <div className="mt-auto min-h-12 pt-3 text-xs text-neutral-500">
          <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap font-medium text-neutral-700 dark:text-neutral-200">
            <span>{typeLabel}</span>
            {item.source && (
              <>
                <span
                  className="text-neutral-300 dark:text-neutral-700"
                  aria-hidden="true"
                >
                  -
                </span>
                <span className="min-w-0 truncate">{item.source}</span>
              </>
            )}
          </div>

          {item.categories.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.categories.map((category) => (
                <span
                  key={category.slug}
                  className="rounded border border-neutral-200 px-1.5 py-0.5 font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                >
                  {category.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-1.5 flex items-center gap-3">
            <span>{formattedDate}</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" aria-hidden="true" />{item.viewCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="size-3" aria-hidden="true" />{item.likesCount}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
