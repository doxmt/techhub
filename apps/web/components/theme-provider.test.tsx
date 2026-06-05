import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
  it("children을 렌더한다", () => {
    render(
      <ThemeProvider>
        <span>theme child</span>
      </ThemeProvider>,
    );

    expect(screen.getByText("theme child")).toBeInTheDocument();
  });
});
