"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SortValue = "latest" | "oldest" | "views" | "recommended";
type PeriodValue = "day" | "week" | "month" | "all";

type Props = {
  currentSort: SortValue;
  currentPeriod: PeriodValue;
  preservedParams: {
    q?: string;
    category?: string;
    lang?: string;
    section?: string;
    view?: string;
  };
};

const sortOptions = [
  { value: "latest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "views", label: "조회수" },
  { value: "recommended", label: "추천수" },
] as const;

const periodOptions = [
  { value: "day", label: "하루" },
  { value: "week", label: "일주일" },
  { value: "month", label: "한달" },
  { value: "all", label: "전체" },
] as const;

export function FeedSortFilter({
  currentSort,
  currentPeriod,
  preservedParams,
}: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sort, setSort] = useState<SortValue>(currentSort);
  const [period, setPeriod] = useState<PeriodValue>(currentPeriod);

  useEffect(() => {
    setSort(currentSort);
    setPeriod(currentPeriod);
  }, [currentSort, currentPeriod]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  function handleApply() {
    const params = new URLSearchParams();
    Object.entries(preservedParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (sort !== "latest") params.set("sort", sort);
    if (period !== "all") params.set("period", period);

    const query = params.toString();
    router.push(query.length > 0 ? `/?${query}` : "/");
    setIsOpen(false);
  }

  function handleClose() {
    setSort(currentSort);
    setPeriod(currentPeriod);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="필터 열기"
        onClick={() => setIsOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-500">정렬</p>
            <div className="grid gap-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={cn(
                    "rounded px-2 py-1.5 text-left text-sm transition",
                    sort === option.value
                      ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-neutral-950"
                      : "text-neutral-700 hover:bg-teal-50 hover:text-teal-700 dark:text-neutral-200 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-neutral-500">기간</p>
            <div className="grid grid-cols-2 gap-1">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={cn(
                    "rounded px-2 py-1.5 text-center text-sm transition",
                    period === option.value
                      ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-neutral-950"
                      : "text-neutral-700 hover:bg-teal-50 hover:text-teal-700 dark:text-neutral-200 dark:hover:bg-teal-950/30 dark:hover:text-teal-300",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-9 rounded-md border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="h-9 rounded-md bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-neutral-950 dark:hover:bg-teal-400"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
