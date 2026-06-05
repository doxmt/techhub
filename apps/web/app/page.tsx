import { ArrowUpRight, Code2, Search } from "lucide-react";
import { parseFeedParams } from "@techhub/shared";
import { getFeed } from "../features/feed/server/service";
import { FeedFilters } from "../components/feed/feed-filters";
import { FeedInfiniteScroll } from "../components/feed/feed-infinite-scroll";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parseFeedParams(params);
  const { items, nextCursor } = await getFeed(filters);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="border-b border-neutral-200 bg-white/90 dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-neutral-950 text-white dark:border-neutral-800 dark:bg-white dark:text-neutral-950">
              <Code2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">TechHub</p>
              <p className="text-xs text-neutral-500">Developer content feed</p>
            </div>
          </div>
          <a
            className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            href="/admin"
          >
            Admin
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit">
          <FeedFilters currentFilters={filters} />
        </aside>
        <div>
          <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-normal">
                  최신 개발 콘텐츠
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                  FE, BE, Cloud, Claude Code, AI Agents 자료를 한 곳에서 탐색합니다.
                </p>
              </div>
              <label className="flex min-w-0 items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800">
                <Search className="size-4 shrink-0" aria-hidden="true" />
                <input
                  name="q"
                  className="min-w-0 bg-transparent outline-none placeholder:text-neutral-400"
                  placeholder="검색어 입력"
                  type="search"
                  defaultValue={filters.q ?? ""}
                />
              </label>
            </div>
          </div>
          <FeedInfiniteScroll
            initialItems={items}
            nextCursor={nextCursor}
            filters={filters}
          />
        </div>
      </section>
    </main>
  );
}
