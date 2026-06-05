import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentActions } from "../../components/feed/content-actions";

vi.mock("../../features/auth/server/actions", () => ({
  toggleBookmark: vi.fn().mockResolvedValue({ bookmarked: true }),
  toggleLike: vi.fn().mockResolvedValue({ liked: true }),
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  signUp: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ContentActions", () => {
  it("북마크 버튼을 렌더한다", () => {
    render(
      <ContentActions
        contentId={1}
        isBookmarked={false}
        isLiked={false}
        isLoggedIn={false}
      />,
    );
    expect(screen.getByLabelText("북마크")).toBeInTheDocument();
    expect(screen.queryByLabelText("좋아요")).not.toBeInTheDocument();
  });

  it("비로그인 시 북마크 클릭하면 로그인 다이얼로그가 열린다", () => {
    render(
      <ContentActions
        contentId={1}
        isBookmarked={false}
        isLiked={false}
        isLoggedIn={false}
      />,
    );
    fireEvent.click(screen.getByLabelText("북마크"));
    expect(screen.getByText("TechHub")).toBeInTheDocument();
  });
});
