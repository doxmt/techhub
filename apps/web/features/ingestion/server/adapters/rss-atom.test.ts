import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRssAtom } from "./rss-atom";

const SOURCE = {
  id: "src-1",
  name: "카카오 테크",
  feed_url: "https://tech.kakao.com/feed/",
  feed_type: "rss" as const,
  default_language: "ko" as const,
};

const RECENT_DATE = new Date(Date.now() - 60 * 60 * 1000).toUTCString(); // 1시간 전

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>테스트 아티클</title>
    <link>https://tech.kakao.com/2026/01/test/</link>
    <pubDate>${RECENT_DATE}</pubDate>
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
  <item><title>링크있음</title><link>https://tech.kakao.com/ok/</link><pubDate>${RECENT_DATE}</pubDate></item>
</channel></rss>`;

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => xmlWithNoLink,
    }));

    const result = await fetchRssAtom(SOURCE, new AbortController().signal);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("링크있음");
  });

  describe("GeekNews neo 작성자 제외", () => {
    const GEEKNEWS = {
      ...SOURCE,
      name: "GeekNews",
      feed_url: "https://news.hada.io/rss/news",
      feed_type: "atom" as const,
    };
    const RECENT_ISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const entry = (n: number, author: string) => `<entry>
      <title>Entry ${n}</title>
      <link href="https://news.hada.io/topic?id=${n}"/>
      <published>${RECENT_ISO}</published>
      <updated>${RECENT_ISO}</updated>
      <author><name>${author}</name></author>
      <content type="html">본문 ${n}</content>
    </entry>`;

    const atom = (entries: string[]) =>
      `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom">${entries.join("")}</feed>`;

    const stubFeed = (xml: string) =>
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => xml }));

    it("GeekNews 피드에서 neo 작성 항목은 제외하고 나머지는 유지한다", async () => {
      stubFeed(atom([entry(1, "neo"), entry(2, "xguru"), entry(3, " NEO "), entry(4, "ironman")]));

      const result = await fetchRssAtom(GEEKNEWS, new AbortController().signal);

      expect(result.map((r) => r.title)).toEqual(["Entry 2", "Entry 4"]);
    });

    it("GeekNews가 아닌 소스는 neo 작성자라도 제외하지 않는다", async () => {
      stubFeed(atom([entry(1, "neo"), entry(2, "xguru")]));

      const result = await fetchRssAtom(SOURCE, new AbortController().signal);

      expect(result.length).toBe(2);
    });
  });
});
