"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CATEGORIES, CONTENT_TYPES, CONTENT_LANGUAGES } from "@techhub/shared";
import { cn } from "@/lib/utils";

type Filters = {
  q?: string;
  category?: string;
  type?: string;
  lang?: string;
};

type Props = {
  currentFilters: Filters;
};

export function FeedFilters({ currentFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleFilter(key: string, value: string, current: string | undefined) {
    updateFilter(key, current === value ? undefined : value);
  }

  return (
    <div className="space-y-5 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
          카테고리
        </p>
        <div className="flex flex-wrap gap-2 lg:block lg:space-y-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => toggleFilter("category", cat.slug, currentFilters.category)}
              className={cn(
                "w-full rounded-md px-2 py-1 text-left text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-800",
                currentFilters.category === cat.slug
                  ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-600 dark:text-neutral-300",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
          타입
        </p>
        <div className="flex gap-2">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleFilter("type", type, currentFilters.type)}
              className={cn(
                "rounded-md border px-2 py-1 text-sm transition",
                currentFilters.type === type
                  ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800",
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
          언어
        </p>
        <div className="flex gap-2">
          {CONTENT_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggleFilter("lang", lang, currentFilters.lang)}
              className={cn(
                "rounded-md border px-2 py-1 text-sm transition",
                currentFilters.lang === lang
                  ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800",
              )}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
