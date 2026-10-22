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
  categories: [
    { name: "Frontend", slug: "fe" },
    { name: "Performance", slug: "performance" },
  ],
  tags: [{ name: "React" }],
};

describe("ContentCard", () => {
  it("제목, 출처, 타입을 렌더한다", () => {
    render(<ContentCard item={FIXTURE} />);
    expect(
      screen.getByText("React Server Components 완벽 가이드")
    ).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("아티클")).toBeInTheDocument();
  });

  it("뉴스 섹션이면 타입 대신 뉴스 라벨을 렌더한다", () => {
    render(<ContentCard item={{ ...FIXTURE, section: "news" }} />);

    expect(screen.getByText("뉴스")).toBeInTheDocument();
    expect(screen.queryByText("아티클")).not.toBeInTheDocument();
  });

  it("뉴스 섹션이면 주제 배지를 렌더하지 않는다", () => {
    render(<ContentCard item={{ ...FIXTURE, section: "news" }} />);

    expect(screen.queryByText("Frontend")).not.toBeInTheDocument();
    expect(screen.queryByText("Performance")).not.toBeInTheDocument();
  });

  it("thumbnailUrl이 null이면 placeholder를 렌더한다", () => {
    render(<ContentCard item={{ ...FIXTURE, thumbnailUrl: null }} />);
    // 썸네일 이미지가 없을 때 placeholder 요소가 있어야 한다.
    const placeholder = document.querySelector(
      "[data-testid='thumbnail-placeholder']"
    );
    expect(placeholder).toBeInTheDocument();
  });

  it("description이 null이면 렌더하지 않거나 fallback을 표시한다", () => {
    render(<ContentCard item={{ ...FIXTURE, description: null }} />);
    // 설명 없이도 크래시 없이 렌더된다.
    expect(
      screen.getByText("React Server Components 완벽 가이드")
    ).toBeInTheDocument();
    // "RSC 설명" 텍스트는 없어야 한다.
    expect(screen.queryByText("RSC 설명")).not.toBeInTheDocument();
  });

  it("연결된 category를 모두 렌더한다", () => {
    render(<ContentCard item={FIXTURE} />);
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
  });

  it("publishedAt을 포맷된 날짜로 표시한다", () => {
    render(<ContentCard item={FIXTURE} />);
    // ISO 원문이 아닌 포맷된 날짜 문자열이 있어야 한다.
    // "2026-05-01T09:00:00+00:00" 원문은 표시하지 않는다.
    expect(
      screen.queryByText("2026-05-01T09:00:00+00:00")
    ).not.toBeInTheDocument();
    // 연도 "2026"은 포맷된 날짜 어딘가에 포함돼야 한다.
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("카드 전체가 외부 URL 링크를 가진다 (article 타입)", () => {
    render(<ContentCard item={FIXTURE} />);
    // article 타입 카드는 외부 링크(href가 있는 a 태그)를 포함해야 한다.
    const links = document.querySelectorAll("a[href]");
    expect(links.length).toBeGreaterThan(0);
  });

  describe("공모전 섹션", () => {
    const CONTEST_FIXTURE: FeedItem = {
      ...FIXTURE,
      section: "contest",
      source: "넥슨",
      contestType: "hackathon",
      deadline: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
    };

    it("공모전 유형을 라벨로 표시한다", () => {
      render(<ContentCard item={CONTEST_FIXTURE} />);
      expect(screen.getByText("해커톤")).toBeInTheDocument();
      expect(screen.queryByText("아티클")).not.toBeInTheDocument();
    });

    it("알 수 없는 유형이면 공모전 라벨로 표시한다", () => {
      render(<ContentCard item={{ ...CONTEST_FIXTURE, contestType: null }} />);
      expect(screen.getByText("공모전")).toBeInTheDocument();
    });

    it("진행중 공모전은 D-day를 표시한다", () => {
      render(<ContentCard item={CONTEST_FIXTURE} />);
      expect(screen.getByText(/^D-\d+$/)).toBeInTheDocument();
    });

    it("마감된 공모전은 마감 라벨을 표시한다", () => {
      render(
        <ContentCard
          item={{ ...CONTEST_FIXTURE, deadline: "2020-01-01T00:00:00.000Z" }}
        />
      );
      expect(screen.getByText("마감")).toBeInTheDocument();
    });

    it("마감일 없는 공모전은 상시로 표시한다", () => {
      render(<ContentCard item={{ ...CONTEST_FIXTURE, deadline: null }} />);
      expect(screen.getByText("상시")).toBeInTheDocument();
    });

    it("공모전 카드에는 주제 배지를 렌더하지 않는다", () => {
      render(<ContentCard item={CONTEST_FIXTURE} />);
      expect(screen.queryByText("Frontend")).not.toBeInTheDocument();
    });
  });
  describe("행사 섹션", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const EVENT_FIXTURE: FeedItem = {
      ...FIXTURE,
      section: "event",
      source: "코엑스",
      description: "코엑스 Hall C",
      publishedAt: new Date(Date.now() + 5 * DAY).toISOString(),
      deadline: new Date(Date.now() + 7 * DAY).toISOString(),
    };

    it("행사 라벨을 표시한다", () => {
      render(<ContentCard item={EVENT_FIXTURE} />);
      expect(screen.getByText("행사")).toBeInTheDocument();
      expect(screen.queryByText("아티클")).not.toBeInTheDocument();
    });

    it("등록일 대신 행사 기간을 표시한다", () => {
      render(<ContentCard item={EVENT_FIXTURE} />);
      expect(screen.getByText(/^\d{2}\.\d{2} – \d{2}\.\d{2}$/)).toBeInTheDocument();
      expect(screen.queryByText(/\d{4}\.\d{2}\.\d{2}/)).not.toBeInTheDocument();
    });

    it("시작 전 행사는 D-n 배지를 표시한다", () => {
      render(<ContentCard item={EVENT_FIXTURE} />);
      expect(screen.getByText(/^D-\d+$/)).toBeInTheDocument();
    });

    it("진행 중인 행사는 진행중 배지를 표시한다", () => {
      render(
        <ContentCard
          item={{
            ...EVENT_FIXTURE,
            publishedAt: new Date(Date.now() - DAY).toISOString(),
          }}
        />
      );
      expect(screen.getByText("진행중")).toBeInTheDocument();
    });

    it("장소(설명)를 표시하고 주제 배지는 렌더하지 않는다", () => {
      render(<ContentCard item={EVENT_FIXTURE} />);
      expect(screen.getByText("코엑스 Hall C")).toBeInTheDocument();
      expect(screen.queryByText("Frontend")).not.toBeInTheDocument();
    });
  });
});
