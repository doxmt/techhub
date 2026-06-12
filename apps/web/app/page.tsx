import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Code2,
  Grid2X2,
  List,
  Newspaper,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { CATEGORIES, NEWS_SOURCES, SOURCES, parseFeedParams } from "@techhub/shared";
import { getFeed } from "../features/feed/server/service";
import { getSavedFeed } from "../features/auth/server/service";
import { FeedInfiniteScroll } from "../components/feed/feed-infinite-scroll";
import { FeedSortFilter } from "../components/feed/feed-sort-filter";
import { ThemeToggle } from "../components/theme-toggle";
import { HeaderUserMenu } from "../features/auth/components/header-user-menu";
import { createClient } from "../lib/supabase/server";
import { cn } from "../lib/utils";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parseFeedParams(params);
  const currentSection = filters.section ?? "news";
  const currentView = params.view === "list" ? "list" : "grid";
  const currentSort =
    params.sort === "oldest" ||
    params.sort === "views" ||
    params.sort === "recommended"
      ? params.sort
      : "latest";
  const currentPeriod =
    params.period === "day" ||
    params.period === "week" ||
    params.period === "month"
      ? params.period
      : "all";

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const authUser = userData?.user ?? null;

  let userProfile: { nickname: string; email: string } | null = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname, email")
      .eq("user_id", authUser.id)
      .single();
    if (profile) {
      userProfile = { nickname: profile.nickname ?? authUser.email ?? "", email: profile.email ?? authUser.email ?? "" };
    } else {
      userProfile = { nickname: authUser.email ?? "", email: authUser.email ?? "" };
    }
  }

  const placeholderSections = ["contest", "recommended"];
  const activeCategories =
    currentSection === "article" ? (filters.categories ?? []) : [];
  const sourceOptions: readonly string[] =
    currentSection === "news"
      ? NEWS_SOURCES
      : currentSection === "article"
        ? SOURCES
        : [];
  const currentSource =
    filters.source && sourceOptions.includes(filters.source)
      ? filters.source
      : undefined;
  const feedFilters = {
    ...filters,
    categories: activeCategories,
    source: currentSource,
    section: currentSection,
    sort: currentSort as import("../features/feed/server/service").FeedSort,
    period: currentPeriod as import("../features/feed/server/service").FeedPeriod,
  };
  const { items, nextCursor } =
    placeholderSections.includes(currentSection)
      ? { items: [], nextCursor: null }
      : currentSection === "saved"
        ? authUser
          ? await getSavedFeed({ userId: authUser.id })
          : { items: [], nextCursor: null }
        : await getFeed(feedFilters, undefined, authUser?.id);

  const sectionTabs = [
    {
      value: "news",
      label: "최신 뉴스",
      heading: "최신 개발 뉴스",
      description: "개발 생태계의 중요한 소식을 빠르게 훑어봅니다.",
      icon: Newspaper,
    },
    {
      value: "article",
      label: "아티클",
      heading: "개발 아티클",
      description: "실전 경험과 깊이 있는 기술 글을 모아봅니다.",
      icon: BookOpen,
    },
    {
      value: "contest",
      label: "공모전",
      heading: "개발자 공모전",
      description: "해커톤, 챌린지, 공모전 정보를 준비하고 있습니다.",
      icon: Trophy,
    },
    {
      value: "recommended",
      label: "추천",
      heading: "추천 콘텐츠",
      description: "운영자가 고른 개발 콘텐츠를 준비하고 있습니다.",
      icon: Sparkles,
    },
    {
      value: "saved",
      label: "저장됨",
      heading: "저장한 콘텐츠",
      description: "북마크한 뉴스와 아티클을 모아볼 수 있습니다.",
      icon: Bookmark,
    },
  ] as const;
  const activeSection =
    sectionTabs.find((tab) => tab.value === currentSection) ?? sectionTabs[0];
  const placeholderContent = {
    contest: {
      icon: Trophy,
      title: "공모전 데이터 준비중",
      description:
        "해커톤, 챌린지, 개발자 공모전 정보를 별도 섹션으로 모을 예정입니다. 지금은 아티클을 먼저 탐색할 수 있습니다.",
      previewItems: ["해커톤", "오픈소스 챌린지", "기업 기술 공모전"],
    },
    recommended: {
      icon: Sparkles,
      title: "추천 섹션 준비중",
      description:
        "운영자가 선별한 주요 콘텐츠를 따로 모아볼 수 있게 준비하고 있습니다.",
      previewItems: ["이번 주 주요 소식", "깊이 읽을 글", "주목할 도구"],
    },
  } as const;
  const activePlaceholder =
    currentSection === "contest" ||
    currentSection === "recommended"
      ? placeholderContent[currentSection]
      : null;
  const EmptyIcon = activePlaceholder?.icon ?? Trophy;
  const showSavedLoginRequired = currentSection === "saved" && !authUser;

  const currentCategories = activeCategories;

  function baseParams() {
    const nextParams = new URLSearchParams();
    if (filters.q) nextParams.set("q", filters.q);
    if (currentSection === "article" && currentCategories.length > 0) {
      nextParams.set("categories", currentCategories.join(","));
    }
    if ((currentSection === "article" || currentSection === "news") && currentSource) {
      nextParams.set("source", currentSource);
    }
    if (filters.lang) nextParams.set("lang", filters.lang);
    if (currentSection !== "news") nextParams.set("section", currentSection);
    if (currentView === "list") nextParams.set("view", currentView);
    if (currentSort !== "latest") nextParams.set("sort", currentSort);
    if (currentPeriod !== "all") nextParams.set("period", currentPeriod);
    return nextParams;
  }

  function paramsHref(nextParams: URLSearchParams) {
    const query = nextParams.toString();
    return query.length > 0 ? `/?${query}` : "/";
  }

  function sectionHref(section: (typeof sectionTabs)[number]["value"]) {
    const nextParams = baseParams();
    nextParams.delete("section");
    if (section !== "article") {
      nextParams.delete("categories");
    }
    if (section !== "article" && section !== "news") {
      nextParams.delete("source");
    }
    if (section !== "news") nextParams.set("section", section);
    return paramsHref(nextParams);
  }

  function viewHref(view: "list" | "grid") {
    const nextParams = baseParams();
    nextParams.delete("view");
    if (view === "list") nextParams.set("view", view);
    return paramsHref(nextParams);
  }

  function sourceHref(source?: string) {
    const nextParams = baseParams();
    nextParams.delete("source");
    if (source) nextParams.set("source", source);
    return paramsHref(nextParams);
  }

  function toggleCategoryHref(slug: string) {
    const nextParams = baseParams();
    const cats = currentCategories as string[];
    if (cats.includes(slug)) {
      const updated = cats.filter((c) => c !== slug);
      if (updated.length > 0) nextParams.set("categories", updated.join(","));
      else nextParams.delete("categories");
    } else if (cats.length < 3) {
      nextParams.set("categories", [...cats, slug].join(","));
    }
    return paramsHref(nextParams);
  }

  function clearCategoriesHref() {
    const nextParams = baseParams();
    nextParams.delete("categories");
    return paramsHref(nextParams);
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-900 dark:text-neutral-50">
      <header className="border-b border-neutral-200 bg-white/90 dark:border-neutral-700 dark:bg-neutral-800/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border border-teal-200 bg-teal-600 text-white dark:border-teal-900/60 dark:bg-teal-500 dark:text-neutral-950">
              <Code2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">TechHub</p>
              <p className="text-xs text-neutral-500">Developer hub community</p>
            </div>
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <HeaderUserMenu user={userProfile} />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div>
          <div className="mb-5 border-b border-neutral-200 pb-4 dark:border-neutral-700">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-teal-600 dark:text-teal-400">
                    Developer hub
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                    {activeSection.heading}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                    {activeSection.description}
                  </p>
                </div>
                <form
                  action="/"
                  className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-500 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-800/70 dark:focus-within:border-teal-400 lg:w-96"
                >
                  {currentSection !== "news" && (
                    <input type="hidden" name="section" value={currentSection} />
                  )}
                  {currentView === "list" && (
                    <input type="hidden" name="view" value={currentView} />
                  )}
                  {currentSort !== "latest" && (
                    <input type="hidden" name="sort" value={currentSort} />
                  )}
                  {currentPeriod !== "all" && (
                    <input type="hidden" name="period" value={currentPeriod} />
                  )}
                  {currentSection === "article" && currentCategories.length > 0 && (
                    <input type="hidden" name="categories" value={currentCategories.join(",")} />
                  )}
                  {currentSource && (
                    <input type="hidden" name="source" value={currentSource} />
                  )}
                  {filters.lang && (
                    <input type="hidden" name="lang" value={filters.lang} />
                  )}
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <input
                    name="q"
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400"
                    placeholder="뉴스, 기술명, 회사명, 태그 검색"
                    type="search"
                    defaultValue={filters.q ?? ""}
                  />
                </form>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <nav
                  className="grid flex-1 rounded-md border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-800/70 sm:grid-cols-5"
                  aria-label="콘텐츠 섹션"
                >
                  {sectionTabs.map((tab) => {
                    const isActive = currentSection === tab.value;
                    const TabIcon = tab.icon;
                    return (
                      <a
                        key={tab.value}
                        href={sectionHref(tab.value)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex h-9 min-w-0 items-center justify-center rounded px-3 text-sm font-medium transition",
                          isActive
                            ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-neutral-950"
                            : "text-neutral-600 hover:bg-teal-50 hover:text-teal-700 dark:text-neutral-300 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                        )}
                      >
                        <TabIcon className="mr-2 size-4 shrink-0" aria-hidden="true" />
                        {tab.label}
                      </a>
                    );
                  })}
                </nav>
                <div className="flex gap-2">
                  <FeedSortFilter
                    currentSort={currentSort}
                    currentPeriod={currentPeriod}
                    preservedParams={{
                      q: filters.q,
                      categories:
                        currentSection === "article" && currentCategories.length > 0
                          ? currentCategories.join(",")
                          : undefined,
                      source: currentSource,
                      lang: filters.lang,
                      section: currentSection !== "news" ? currentSection : undefined,
                      view: currentView === "list" ? currentView : undefined,
                    }}
                  />
                  <div
                    className="grid grid-cols-2 rounded-md border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-800/70"
                    aria-label="보기 방식"
                  >
                    <a
                      href={viewHref("list")}
                      aria-current={currentView === "list" ? "page" : undefined}
                      className={cn(
                        "flex size-9 items-center justify-center rounded transition",
                        currentView === "list"
                          ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-neutral-950"
                          : "text-neutral-600 hover:bg-teal-50 hover:text-teal-700 dark:text-neutral-300 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                      )}
                    >
                      <List className="size-4" aria-hidden="true" />
                      <span className="sr-only">한 줄 보기</span>
                    </a>
                    <a
                      href={viewHref("grid")}
                      aria-current={currentView === "grid" ? "page" : undefined}
                      className={cn(
                        "flex size-9 items-center justify-center rounded transition",
                        currentView === "grid"
                          ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-neutral-950"
                          : "text-neutral-600 hover:bg-teal-50 hover:text-teal-700 dark:text-neutral-300 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                      )}
                    >
                      <Grid2X2 className="size-4" aria-hidden="true" />
                      <span className="sr-only">4개씩 보기</span>
                    </a>
                  </div>
                </div>
              </div>

              {(currentSection === "article" || currentSection === "news") && (
                <>
                  <nav
                    aria-label="출처"
                    className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
                  >
                    <a
                      href={sourceHref(undefined)}
                      aria-current={!currentSource ? "page" : undefined}
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition",
                        !currentSource
                          ? "border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-300"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:border-teal-900 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                      )}
                    >
                      전체
                    </a>
                    {sourceOptions.map((source) => {
                      const isActive = currentSource === source;
                      return (
                        <a
                          key={source}
                          href={sourceHref(isActive ? undefined : source)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition",
                            isActive
                              ? "border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-300"
                              : "border-neutral-200 bg-white text-neutral-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:border-teal-900 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                          )}
                        >
                          {source}
                        </a>
                      );
                    })}
                  </nav>

                  {currentSection === "article" && (
                    <nav
                      aria-label="주제"
                      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
                    >
                      <a
                        href={clearCategoriesHref()}
                        aria-current={currentCategories.length === 0 ? "page" : undefined}
                        className={cn(
                          "inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition",
                          currentCategories.length === 0
                            ? "border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-300"
                            : "border-neutral-200 bg-white text-neutral-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:border-teal-900 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                        )}
                      >
                        전체
                      </a>
                      {CATEGORIES.map((category) => {
                        const isActive = currentCategories.includes(category.slug);
                        const isDisabled = !isActive && currentCategories.length >= 3;
                        return (
                          <a
                            key={category.slug}
                            href={isDisabled ? "#" : toggleCategoryHref(category.slug)}
                            aria-current={isActive ? "page" : undefined}
                            aria-disabled={isDisabled}
                            className={cn(
                              "inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition",
                              isActive
                                ? "border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-300"
                                : isDisabled
                                  ? "cursor-not-allowed border-neutral-200 bg-white text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-600"
                                  : "border-neutral-200 bg-white text-neutral-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:border-teal-900 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                            )}
                          >
                            {category.name}
                          </a>
                        );
                      })}
                      {currentCategories.length > 0 && (
                        <span className="inline-flex h-8 shrink-0 items-center px-1 text-xs text-neutral-400">
                          {currentCategories.length}/3
                        </span>
                      )}
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
          {activePlaceholder ? (
            <section className="rounded-md border border-dashed border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800/60">
              <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-teal-50 dark:bg-teal-950/40">
                <EmptyIcon className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">{activePlaceholder.title}</h2>
              <p className="mt-2 max-w-xl text-sm text-neutral-500">
                {activePlaceholder.description}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {activePlaceholder.previewItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <a
                  href={sectionHref("article")}
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  아티클 보기
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </div>
            </section>
          ) : showSavedLoginRequired ? (
            <section className="rounded-md border border-dashed border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800/60">
              <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-teal-50 dark:bg-teal-950/40">
                <Bookmark className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
              <p className="mt-2 max-w-xl text-sm text-neutral-500">
                저장한 콘텐츠를 보려면 로그인해 주세요. 로그인 후 북마크한 뉴스와 아티클을 이곳에서 확인할 수 있습니다.
              </p>
              <div className="mt-5">
                <a
                  href={sectionHref("article")}
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  아티클 보기
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </div>
            </section>
          ) : (
            <FeedInfiniteScroll
              initialItems={items}
              nextCursor={nextCursor}
              filters={feedFilters}
              view={currentView}
              isLoggedIn={!!authUser}
            />
          )}
        </div>
      </section>
    </main>
  );
}
