/**
 * content-card.test.tsx
 *
 * TDD: 이 테스트 파일은 아직 존재하지 않는 컴포넌트를 대상으로 작성됐다.
 * apps/web/components/feed/content-card.tsx 가 없으므로 모든 테스트가
 * "Cannot find module" 오류로 실패해야 한다.
 *
 * 컴포넌트 구현 후 이 테스트가 통과해야 단계 4가 완료된다.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ContentCard } from "../../components/feed/content-card";
import type { FeedItem } from "../../features/feed/server/service";

const FIXTURE: FeedItem = {
  id: "1",
  url: "https://example.com/react-server-components",
  title: "React Server Components 완벽 가이드",
  description: "RSC 설명",
  thumbnailUrl: "https://example.com/thumb.png",
  source: "example.com",
  type: "article",
  language: "ko",
  slug: "react-server-components",
  publishedAt: "2026-05-01T09:00:00+00:00",
  categories: [{ name: "Frontend", slug: "fe" }],
  tags: [{ name: "React" }],
};

describe("ContentCard", () => {
  it("제목, 출처, 타입을 렌더한다", () => {
    render(<ContentCard item={FIXTURE} />);
    expect(screen.getByText("React Server Components 완벽 가이드")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("아티클")).toBeInTheDocument();
  });

  it("thumbnailUrl이 null이면 placeholder를 렌더한다", () => {
    render(<ContentCard item={{ ...FIXTURE, thumbnailUrl: null }} />);
    // 썸네일 이미지가 없을 때 placeholder 요소가 있어야 한다.
    const placeholder = document.querySelector("[data-testid='thumbnail-placeholder']");
    expect(placeholder).toBeInTheDocument();
  });

  it("description이 null이면 렌더하지 않거나 fallback을 표시한다", () => {
    render(<ContentCard item={{ ...FIXTURE, description: null }} />);
    // 설명 없이도 크래시 없이 렌더된다.
    expect(screen.getByText("React Server Components 완벽 가이드")).toBeInTheDocument();
    // "RSC 설명" 텍스트는 없어야 한다.
    expect(screen.queryByText("RSC 설명")).not.toBeInTheDocument();
  });

  it("첫 번째 category를 메타 정보로 렌더한다", () => {
    render(<ContentCard item={FIXTURE} />);
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("publishedAt을 포맷된 날짜로 표시한다", () => {
    render(<ContentCard item={FIXTURE} />);
    // ISO 원문이 아닌 포맷된 날짜 문자열이 있어야 한다.
    // "2026-05-01T09:00:00+00:00" 원문은 표시하지 않는다.
    expect(screen.queryByText("2026-05-01T09:00:00+00:00")).not.toBeInTheDocument();
    // 연도 "2026"은 포맷된 날짜 어딘가에 포함돼야 한다.
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("카드 전체가 외부 URL 링크를 가진다 (article 타입)", () => {
    render(<ContentCard item={FIXTURE} />);
    // article 타입 카드는 외부 링크(href가 있는 a 태그)를 포함해야 한다.
    const links = document.querySelectorAll("a[href]");
    expect(links.length).toBeGreaterThan(0);
  });
});
