import { describe, expect, it } from "vitest";
import { parseSlugId } from "../../lib/slug";

describe("parseSlugId", () => {
  it("마지막 세그먼트가 숫자인 slug에서 slug와 id를 분리한다", () => {
    expect(parseSlugId("nextjs-tutorial-42")).toEqual({
      slug: "nextjs-tutorial",
      id: 42,
    });
  });

  it("단일 단어 slug에서 id를 분리한다", () => {
    expect(parseSlugId("a-1")).toEqual({ slug: "a", id: 1 });
  });

  it("숫자로 끝나지 않는 경우 null을 반환한다", () => {
    expect(parseSlugId("no-numbers")).toBeNull();
  });

  it("빈 문자열이면 null을 반환한다", () => {
    expect(parseSlugId("")).toBeNull();
  });

  it("중간에 숫자가 있어도 마지막 세그먼트가 숫자인 경우 정상 파싱한다", () => {
    expect(parseSlugId("title-with-multiple-dashes-123")).toEqual({
      slug: "title-with-multiple-dashes",
      id: 123,
    });
  });
});
