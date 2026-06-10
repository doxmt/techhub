import { describe, expectTypeOf, it } from "vitest";
import type { Database } from "./types.gen";

type ContentItemRow = Database["public"]["Tables"]["content_items"]["Row"];

describe("generated Supabase content_items types", () => {
  it("includes feed section and counter columns", () => {
    expectTypeOf<ContentItemRow>().toHaveProperty("section").toEqualTypeOf<string>();
    expectTypeOf<ContentItemRow>().toHaveProperty("view_count").toEqualTypeOf<number>();
    expectTypeOf<ContentItemRow>().toHaveProperty("likes_count").toEqualTypeOf<number>();
  });
});
