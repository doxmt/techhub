import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRssAtom } from "./rss-atom";

const SOURCE = {
  id: "src-1",
  name: "카카오 테크",
  feed_url: "https://tech.kakao.com/feed/",
  feed_type: "rss" as const,
  default_language: "ko" as const,
};

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>테스트 아티클</title>
    <link>https://tech.kakao.com/2026/01/test/</link>
    <pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate>
    <description>테스트 설명입니다.</description>
  </item>
</channel></rss>`;

describe("fetchRssAtom", () => {
  beforeEach(() => vi.clearAllMocks());

  it("정상 응답이면 ContentItemInsert 배열을 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => RSS_XML,
    }));

    const result = await fetchRssAtom(SOURCE, new AbortController().signal);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("테스트 아티클");
    expect(result[0].status).toBe("published");
    expect(result[0].language).toBe("ko");
  });

  it("HTTP 오류면 예외를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(fetchRssAtom(SOURCE, new AbortController().signal)).rejects.toThrow("HTTP 404");
  });

  it("link가 없는 항목은 결과에서 제외한다", async () => {
    const xmlWithNoLink = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>링크없음</title></item>
  <item><title>링크있음</title><link>https://tech.kakao.com/ok/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
</channel></rss>`;

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => xmlWithNoLink,
    }));

    const result = await fetchRssAtom(SOURCE, new AbortController().signal);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("링크있음");
  });
});
