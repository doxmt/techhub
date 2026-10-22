import type { FeedItem } from "@/features/feed/server/service";
import type { SavedSection } from "@/features/auth/server/service";
import { SAVED_SECTIONS } from "@/features/auth/server/service";
import { FeedInfiniteScroll } from "@/components/feed/feed-infinite-scroll";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<SavedSection, string> = {
  all: "전체",
  news: "최신뉴스",
  article: "아티클",
  contest: "공모전",
};

type Props = {
  items: FeedItem[];
  nextCursor: string | null;
  activeSection: SavedSection;
  counts: Record<SavedSection, number>;
  isLoggedIn: boolean;
};

export function BookmarkTabs({
  items,
  nextCursor,
  activeSection,
  counts,
  isLoggedIn,
}: Props) {
  return (
    <div>
      {/* 섹션 탭: 상태는 URL query에 유지한다 */}
      <div className="mb-4 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {SAVED_SECTIONS.map((section) => {
          const isActive = section === activeSection;
          return (
            <a
              key={section}
              href={
                section === "all"
                  ? "/?section=saved"
                  : `/?section=saved&saved=${section}`
              }
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-teal-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-600 dark:text-teal-400 dark:after:bg-teal-400"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
              )}
            >
              {SECTION_LABELS[section]}
              {counts[section] > 0 && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                    isActive
                      ? "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400",
                  )}
                >
                  {counts[section]}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-400 dark:text-neutral-500">
          {activeSection === "all"
            ? "아직 저장된 콘텐츠가 없습니다."
            : `저장된 ${SECTION_LABELS[activeSection]} 콘텐츠가 없습니다.`}
        </p>
      ) : (
        <FeedInfiniteScroll
          initialItems={items}
          nextCursor={nextCursor}
          filters={{ section: "saved", saved: activeSection }}
          view="list"
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}
