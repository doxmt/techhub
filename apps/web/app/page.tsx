import {
  ArrowUpRight,
  BookOpen,
  Cloud,
  Code2,
  Filter,
  Search
} from "lucide-react";
import { CONTENT_CATEGORIES, CONTENT_TYPES } from "@techhub/shared";

const featuredItems = [
  {
    title: "Next.js App Router 운영 패턴",
    description: "서버 컴포넌트와 서버 액션 경계를 설계할 때 참고할 만한 아티클",
    source: "example.dev",
    type: "article",
    category: "FE",
    language: "ko"
  },
  {
    title: "AI Agents 아키텍처 입문",
    description: "도구 호출, 메모리, 평가 흐름을 한 번에 훑는 유튜브 세션",
    source: "youtube.com",
    type: "youtube",
    category: "AI Agents",
    language: "en"
  },
  {
    title: "Supabase RLS 실전 체크리스트",
    description: "공개 읽기와 관리자 쓰기 권한을 분리하는 Postgres RLS 설계",
    source: "supabase.com",
    type: "article",
    category: "BE",
    language: "en"
  }
];

export default function HomePage() {
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
        <aside className="h-fit rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Filter className="size-4" aria-hidden="true" />
            Filters
          </div>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
                Category
              </p>
              <div className="flex flex-wrap gap-2 lg:block lg:space-y-1">
                {CONTENT_CATEGORIES.map((category) => (
                  <button
                    className="rounded-md px-2 py-1 text-left text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    key={category}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
                Type
              </p>
              <div className="flex gap-2">
                {CONTENT_TYPES.map((type) => (
                  <button
                    className="rounded-md border border-neutral-200 px-2 py-1 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"
                    key={type}
                    type="button"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
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
                  className="min-w-0 bg-transparent outline-none placeholder:text-neutral-400"
                  placeholder="검색어 입력"
                  type="search"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3">
            {featuredItems.map((item) => (
              <article
                className="rounded-md border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                key={item.title}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
                        {item.type === "article" ? (
                          <BookOpen className="size-3" aria-hidden="true" />
                        ) : (
                          <Cloud className="size-3" aria-hidden="true" />
                        )}
                        {item.type}
                      </span>
                      <span>{item.category}</span>
                      <span>{item.language}</span>
                      <span>{item.source}</span>
                    </div>
                    <h2 className="text-base font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                      {item.description}
                    </p>
                  </div>
                  <button
                    className="inline-flex shrink-0 items-center justify-center rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    type="button"
                  >
                    보기
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
