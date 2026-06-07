-- Seed data for TechHub MVP
-- Categories

INSERT INTO categories (name, slug) VALUES
  ('Frontend', 'fe'),
  ('Backend', 'be'),
  ('Cloud', 'cloud'),
  ('Claude Code', 'claude-code'),
  ('AI Agents', 'ai-agents'),
  ('Tools', 'tools'),
  ('Architecture', 'architecture'),
  ('Career', 'career')
ON CONFLICT (slug) DO NOTHING;

-- Tags

INSERT INTO tags (name) VALUES
  ('React'),
  ('TypeScript'),
  ('Next.js'),
  ('PostgreSQL'),
  ('Docker')
ON CONFLICT (name) DO NOTHING;

-- Content Items (article/youtube 혼합, ko/en 혼합, published/draft 혼합)

INSERT INTO content_items (url, type, title, description, thumbnail, source, language, slug, status, published_at) VALUES
  ('https://blog.example.com/react-server-components-deep-dive', 'article', 'React Server Components 완벽 가이드: 언제, 왜, 어떻게 써야 하는가', 'RSC의 동작 원리와 실전 적용 패턴을 상세히 설명합니다.', 'https://picsum.photos/seed/react-server-components-deep-dive/640/360', 'blog.example.com', 'ko', 'react-server-components-deep-dive', 'published', '2026-05-01 09:00:00+00'),
  ('https://blog.example.com/nextjs-app-router-patterns', 'article', 'Next.js App Router 실전 패턴 모음', 'App Router 전환 후 자주 사용하는 레이아웃, 데이터 패칭 패턴을 정리했습니다.', 'https://picsum.photos/seed/nextjs-app-router-patterns/640/360', 'blog.example.com', 'ko', 'nextjs-app-router-patterns', 'published', '2026-05-05 10:00:00+00'),
  ('https://www.youtube.com/watch?v=abc123', 'youtube', 'TypeScript 5.5 What''s New - Full Walkthrough', 'A comprehensive walkthrough of all new features in TypeScript 5.5.', 'https://picsum.photos/seed/typescript-55-whats-new/640/360', 'youtube.com', 'en', 'typescript-55-whats-new', 'published', '2026-05-08 14:00:00+00'),
  ('https://engineering.example.io/postgres-full-text-search', 'article', 'PostgreSQL Full Text Search: tsvector, tsquery, 그리고 GIN 인덱스', 'Postgres FTS의 핵심 개념과 실제 쿼리 최적화 방법을 다룹니다.', 'https://picsum.photos/seed/postgres-full-text-search/640/360', 'engineering.example.io', 'ko', 'postgres-full-text-search', 'published', '2026-05-10 08:00:00+00'),
  ('https://www.youtube.com/watch?v=def456', 'youtube', 'Building with Claude Code: AI-Powered Development Workflow', 'How to integrate Claude Code into your daily development workflow for maximum productivity.', 'https://picsum.photos/seed/building-with-claude-code/640/360', 'youtube.com', 'en', 'building-with-claude-code', 'published', '2026-05-12 16:00:00+00'),
  ('https://dev.example.com/docker-compose-best-practices', 'article', 'Docker Compose 실전 Best Practices: 개발 환경부터 프로덕션까지', 'docker-compose.yml 작성 시 흔히 저지르는 실수와 권장 패턴을 소개합니다.', 'https://picsum.photos/seed/docker-compose-best-practices/640/360', 'dev.example.com', 'ko', 'docker-compose-best-practices', 'published', '2026-05-15 11:00:00+00'),
  ('https://blog.example.net/microservices-vs-monolith-2026', 'article', 'Microservices vs Monolith in 2026: The Honest Trade-offs Every Team Must Know Before Choosing an Architecture', 'An honest look at the trade-offs between microservices and monolithic architectures in the current landscape.', 'https://picsum.photos/seed/microservices-vs-monolith-2026/640/360', 'blog.example.net', 'en', 'microservices-vs-monolith-2026', 'published', '2026-05-18 09:30:00+00'),
  ('https://www.youtube.com/watch?v=ghi789', 'youtube', 'AI Agents 입문: LangGraph로 멀티 에이전트 시스템 만들기', 'LangGraph를 사용하여 간단한 멀티 에이전트 워크플로우를 구성하는 실습 영상입니다.', 'https://picsum.photos/seed/ai-agents-langgraph-intro/640/360', 'youtube.com', 'ko', 'ai-agents-langgraph-intro', 'published', '2026-05-20 13:00:00+00'),
  ('https://cloud.example.com/kubernetes-cost-optimization', 'article', 'Kubernetes 비용 최적화: 실무에서 검증된 10가지 전략', 'K8s 클러스터 운영 비용을 줄이기 위한 실전 전략을 공유합니다.', 'https://picsum.photos/seed/kubernetes-cost-optimization/640/360', 'cloud.example.com', 'ko', 'kubernetes-cost-optimization', 'published', '2026-05-22 10:00:00+00'),
  ('https://tools.example.dev/cursor-vs-claude-code', 'article', 'Cursor vs Claude Code: A Developer''s Honest Comparison After 3 Months', 'After using both tools daily for three months, here is what I found about productivity, accuracy, and workflow fit.', 'https://picsum.photos/seed/cursor-vs-claude-code/640/360', 'tools.example.dev', 'en', 'cursor-vs-claude-code', 'published', '2026-05-25 15:00:00+00'),
  ('https://www.youtube.com/watch?v=jkl012', 'youtube', 'Supabase RLS 완전 정복: Row Level Security 실전 가이드', 'Supabase에서 RLS 정책을 설계하고 테스트하는 방법을 단계별로 설명합니다.', 'https://picsum.photos/seed/supabase-rls-complete-guide/640/360', 'youtube.com', 'ko', 'supabase-rls-complete-guide', 'published', '2026-05-28 11:00:00+00'),
  ('https://career.example.com/senior-engineer-skills', 'article', 'Senior Engineer가 되기 위해 반드시 갖춰야 할 비기술적 역량', '기술 스택을 넘어 시니어 엔지니어로 성장하기 위한 커뮤니케이션과 설계 사고를 다룹니다.', 'https://picsum.photos/seed/senior-engineer-skills/640/360', 'career.example.com', 'ko', 'senior-engineer-skills', 'published', '2026-05-30 09:00:00+00'),
  ('https://blog.example.org/tailwind-v4-migration', 'article', 'Tailwind CSS v4 Migration Guide: Breaking Changes and New Features', 'Everything you need to know to migrate your project from Tailwind v3 to v4.', 'https://picsum.photos/seed/tailwind-v4-migration/640/360', 'blog.example.org', 'en', 'tailwind-v4-migration', 'published', '2026-06-01 10:00:00+00'),
  ('https://www.youtube.com/watch?v=mno345', 'youtube', 'System Design Interview: URL Shortener from Scratch', 'Walk through designing a scalable URL shortener covering databases, caching, and load balancing.', 'https://picsum.photos/seed/system-design-url-shortener/640/360', 'youtube.com', 'en', 'system-design-url-shortener', 'draft', NULL),
  ('https://draft.example.com/rust-for-js-devs', 'article', 'JavaScript 개발자를 위한 Rust 입문', 'JS/TS 개발자 관점에서 Rust의 소유권, 빌림 개념을 쉽게 설명합니다.', 'https://picsum.photos/seed/rust-for-js-devs/640/360', 'draft.example.com', 'ko', 'rust-for-js-devs', 'draft', NULL),
  ('https://blog.example.com/vercel-edge-functions', 'article', 'Vercel Edge Functions 실전 가이드', 'Edge Runtime에서 동작하는 함수를 작성하고 배포하는 방법을 다룹니다.', 'https://picsum.photos/seed/vercel-edge-functions/640/360', 'blog.example.com', 'ko', 'vercel-edge-functions', 'published', '2026-06-01 10:00:00+00'),
  ('https://www.youtube.com/watch?v=pqr678', 'youtube', 'pnpm Workspaces & Turborepo: Monorepo 완전 정복', NULL, 'https://picsum.photos/seed/pnpm-turborepo-monorepo/640/360', NULL, 'ko', 'pnpm-turborepo-monorepo', 'published', '2026-06-02 09:00:00+00'),
  ('https://blog.example.io/web-vitals-2026', 'article', 'Core Web Vitals 2026: INP 최적화 실전 전략', 'Interaction to Next Paint(INP) 지표를 개선하기 위한 구체적인 기법들을 소개합니다.', 'https://picsum.photos/seed/web-vitals-2026/640/360', 'blog.example.io', 'ko', 'web-vitals-2026', 'published', '2026-06-02 11:00:00+00'),
  ('https://dev.example.net/graphql-vs-rest-2026', 'article', 'GraphQL vs REST in 2026: Which Should You Choose?', 'A pragmatic comparison of GraphQL and REST API design in modern full-stack applications.', 'https://picsum.photos/seed/graphql-vs-rest-2026/640/360', 'dev.example.net', 'en', 'graphql-vs-rest-2026', 'published', '2026-06-03 08:00:00+00'),
  ('https://www.youtube.com/watch?v=stu901', 'youtube', 'Zustand로 상태 관리 단순화하기', 'Redux 없이 Zustand를 이용해 전역 상태를 깔끔하게 관리하는 방법을 설명합니다.', 'https://picsum.photos/seed/zustand-state-management/640/360', 'youtube.com', 'ko', 'zustand-state-management', 'published', '2026-06-03 14:00:00+00'),
  ('https://blog.example.com/drizzle-orm-guide', 'article', 'Drizzle ORM 완벽 가이드: TypeScript-first ORM의 모든 것', 'Prisma 대안으로 주목받는 Drizzle ORM의 기본부터 고급 사용법까지 정리합니다.', 'https://picsum.photos/seed/drizzle-orm-guide/640/360', 'blog.example.com', 'ko', 'drizzle-orm-guide', 'published', '2026-06-04 09:00:00+00'),
  ('https://engineering.example.com/bun-vs-node-2026', 'article', 'Bun vs Node.js 2026: Production 환경 성능 비교', 'Bun 1.x와 Node.js 22를 실제 프로덕션 워크로드에서 비교 분석합니다.', 'https://picsum.photos/seed/bun-vs-node-2026/640/360', 'engineering.example.com', 'en', 'bun-vs-node-2026', 'published', '2026-06-04 12:00:00+00'),
  ('https://blog.example.dev/react-query-v5-guide', 'article', 'TanStack Query v5 마이그레이션 가이드', 'React Query v4에서 v5로 업그레이드 시 달라진 API와 마이그레이션 전략을 정리합니다.', 'https://picsum.photos/seed/react-query-v5-guide/640/360', 'blog.example.dev', 'ko', 'react-query-v5-guide', 'published', '2026-06-05 08:00:00+00')
ON CONFLICT (slug) DO UPDATE
SET thumbnail = EXCLUDED.thumbnail;

-- content_categories 연결

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'react-server-components-deep-dive' AND cat.slug = 'fe'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'nextjs-app-router-patterns' AND cat.slug = 'fe'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'typescript-55-whats-new' AND cat.slug = 'fe'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'postgres-full-text-search' AND cat.slug = 'be'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'building-with-claude-code' AND cat.slug = 'claude-code'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'docker-compose-best-practices' AND cat.slug = 'tools'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'microservices-vs-monolith-2026' AND cat.slug = 'architecture'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'ai-agents-langgraph-intro' AND cat.slug = 'ai-agents'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'kubernetes-cost-optimization' AND cat.slug = 'cloud'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'cursor-vs-claude-code' AND cat.slug = 'tools'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'supabase-rls-complete-guide' AND cat.slug = 'be'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'senior-engineer-skills' AND cat.slug = 'career'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'tailwind-v4-migration' AND cat.slug = 'fe'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'system-design-url-shortener' AND cat.slug = 'architecture'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'rust-for-js-devs' AND cat.slug = 'be'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'vercel-edge-functions' AND cat.slug = 'cloud'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'pnpm-turborepo-monorepo' AND cat.slug = 'tools'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'web-vitals-2026' AND cat.slug = 'fe'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'graphql-vs-rest-2026' AND cat.slug = 'be'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'zustand-state-management' AND cat.slug = 'fe'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'drizzle-orm-guide' AND cat.slug = 'be'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'bun-vs-node-2026' AND cat.slug = 'tools'
ON CONFLICT DO NOTHING;

INSERT INTO content_categories (content_id, category_id)
SELECT ci.id, cat.id
FROM content_items ci, categories cat
WHERE ci.slug = 'react-query-v5-guide' AND cat.slug = 'fe'
ON CONFLICT DO NOTHING;

-- Sources (RSS 수집 소스)

INSERT INTO sources (name, feed_url, feed_type, default_language, default_category_id) VALUES
  ('네이버 D2',       'https://d2.naver.com/d2.atom',                          'atom', 'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('카카오 테크',     'https://tech.kakao.com/feed/',                           'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('라인 LY',         'https://techblog.lycorp.co.jp/ko/feed/index.xml',        'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('쿠팡 엔지니어링', 'https://medium.com/feed/coupang-engineering',            'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('우아한형제들',    'https://techblog.woowahan.com/feed/',                    'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('당근마켓',        'https://medium.com/feed/daangn',                         'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('토스',            'https://toss.tech/rss.xml',                              'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be'))
ON CONFLICT (feed_url) DO NOTHING;

-- content_tags 연결

INSERT INTO content_tags (content_id, tag_id)
SELECT ci.id, t.id
FROM content_items ci, tags t
WHERE ci.slug = 'react-server-components-deep-dive' AND t.name = 'React'
ON CONFLICT DO NOTHING;

INSERT INTO content_tags (content_id, tag_id)
SELECT ci.id, t.id
FROM content_items ci, tags t
WHERE ci.slug = 'nextjs-app-router-patterns' AND t.name = 'Next.js'
ON CONFLICT DO NOTHING;

INSERT INTO content_tags (content_id, tag_id)
SELECT ci.id, t.id
FROM content_items ci, tags t
WHERE ci.slug = 'typescript-55-whats-new' AND t.name = 'TypeScript'
ON CONFLICT DO NOTHING;

INSERT INTO content_tags (content_id, tag_id)
SELECT ci.id, t.id
FROM content_items ci, tags t
WHERE ci.slug = 'postgres-full-text-search' AND t.name = 'PostgreSQL'
ON CONFLICT DO NOTHING;

INSERT INTO content_tags (content_id, tag_id)
SELECT ci.id, t.id
FROM content_items ci, tags t
WHERE ci.slug = 'docker-compose-best-practices' AND t.name = 'Docker'
ON CONFLICT DO NOTHING;
