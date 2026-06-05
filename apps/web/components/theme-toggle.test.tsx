import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

describe("ThemeToggle", () => {
  it("테마 전환 버튼을 렌더한다", () => {
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "다크 모드로 전환" })).toBeInTheDocument();
  });
});
