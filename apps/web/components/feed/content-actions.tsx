"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { toggleBookmark } from "@/features/auth/server/actions";

type Props = {
  contentId: number;
  isBookmarked: boolean;
  isLiked: boolean;
  isLoggedIn: boolean;
  variant?: "list" | "grid";
};

export function ContentActions({
  contentId,
  isBookmarked: initialBookmarked,
  isLoggedIn,
  variant = "list",
}: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleBookmarkClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!isLoggedIn) {
      setDialogOpen(true);
      return;
    }
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const result = await toggleBookmark(contentId);
      if ("error" in result) {
        setBookmarked(!next);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="북마크"
          title={bookmarked ? "북마크 취소" : "북마크"}
          onClick={handleBookmarkClick}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md transition",
            variant === "grid"
              ? "absolute right-2 top-2 border border-white/20 bg-neutral-950/75 text-white backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-neutral-950/85 dark:border-white/20 dark:bg-neutral-950/75 dark:text-white"
              : "border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 sm:opacity-0 sm:group-hover:opacity-100",
            bookmarked
              ? "text-teal-600 dark:text-teal-400"
              : "text-neutral-500 dark:text-neutral-300",
          )}
        >
          <Bookmark
            className={cn("size-4", bookmarked && "fill-current")}
            aria-hidden="true"
          />
        </button>
      </div>
      <AuthDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pendingBookmarkId={contentId}
      />
    </>
  );
}
