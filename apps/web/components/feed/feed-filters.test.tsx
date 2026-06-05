import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedFilters } from "./feed-filters";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("FeedFilters", () => {
  it("주제와 언어 필터를 렌더한다", () => {
    render(<FeedFilters currentFilters={{ section: "news" }} />);

    expect(screen.getByText("주제")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Frontend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "KO" })).toBeInTheDocument();
  });
});
