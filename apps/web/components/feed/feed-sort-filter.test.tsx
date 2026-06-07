import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedSortFilter } from "./feed-sort-filter";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("FeedSortFilter", () => {
  it("필터 적용 버튼을 렌더한다", () => {
    render(
      <FeedSortFilter
        currentSort="latest"
        currentPeriod="all"
        preservedParams={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "필터 열기" }));
    expect(screen.getByRole("button", { name: "적용" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });
});
