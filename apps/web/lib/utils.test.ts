import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges tailwind classes with later values taking precedence", () => {
    expect(cn("px-2", "px-4")).toContain("px-4");
    expect(cn("px-2", "px-4")).not.toContain("px-2");
  });
});
