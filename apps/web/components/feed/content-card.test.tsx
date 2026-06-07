import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FeedItem } from "@/features/feed/server/service";
import { ContentCard } from "./content-card";

const item: FeedItem = {
  id: "1",
  url: "https://example.com/react-server-components",
  title: "React Server Components 완벽 가이드",
  description: "RSC 설명",
  thumbnailUrl: null,
  source: "example.com",
  type: "article",
  language: "ko",
  slug: "react-server-components",
  publishedAt: "2026-05-01T09:00:00+00:00",
  categories: [],
  tags: [],
};

describe("ContentCard", () => {
  it("콘텐츠 타입을 한국어 라벨로 보여준다", () => {
    render(<ContentCard item={item} />);

    expect(screen.getByText("아티클")).toBeInTheDocument();
  });

  it("grid variant를 렌더한다", () => {
    render(<ContentCard item={item} variant="grid" />);

    expect(screen.getByText("React Server Components 완벽 가이드")).toBeInTheDocument();
  });
});
