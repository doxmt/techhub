const KEYWORDS: Record<string, string[]> = {
  "claude-code": [
    "Claude Code", "Cursor", "GitHub Copilot", "Codeium",
    "AI 코딩", "AI Coding",
  ],
  fe: [
    "React", "Vue", "Angular", "CSS", "TypeScript", "JavaScript",
    "프론트엔드", "Frontend", "Next.js", "Nuxt", "Svelte", "Tailwind",
    "Webpack", "Vite", "Zustand", "Redux", "Web Vitals", "UI/UX", "렌더링",
  ],
  architecture: [
    "아키텍처", "Architecture", "System Design", "시스템 설계",
    "DDD", "CQRS", "Event Sourcing", "Clean Architecture",
    "TDD", "Refactoring", "리팩토링", "Pattern", "패턴", "MSA",
  ],
  "ai-agents": [
    "AI", "LLM", "GPT", "Claude", "LangChain", "LangGraph",
    "머신러닝", "딥러닝", "Machine Learning", "Deep Learning",
    "RAG", "Embedding", "Vector", "생성형", "Agent", "Prompt",
    "Fine-tuning", "인공지능",
  ],
  be: [
    "Spring", "Java", "Kotlin", "Python", "Go", "Node.js", "Express",
    "NestJS", "Django", "FastAPI", "백엔드", "Backend", "API", "REST",
    "GraphQL", "MySQL", "PostgreSQL", "Redis", "Kafka", "gRPC",
    "마이크로서비스", "Microservice", "서버", "Server",
  ],
  cloud: [
    "AWS", "GCP", "Azure", "Kubernetes", "K8s", "Docker", "DevOps",
    "CI/CD", "Terraform", "EKS", "ECS", "Lambda", "클라우드", "Cloud",
    "Serverless", "Nginx", "인프라", "Infrastructure",
  ],
  tools: [
    "Git", "GitHub", "VS Code", "IntelliJ", "pnpm", "npm", "yarn",
    "ESLint", "Prettier", "Turborepo", "Monorepo", "개발 환경", "DX",
    "Docker Compose",
  ],
  career: [
    "커리어", "Career", "이직", "면접", "Interview", "성장",
    "회고", "Retrospective", "개발자", "스타트업", "조직", "문화",
    "Culture", "OKR",
  ],
};

/**
 * 제목과 설명 텍스트를 기반으로 카테고리 슬러그를 반환한다.
 * 매칭되는 카테고리가 없으면 null을 반환한다.
 */
export function classifyCategory(
  title: string,
  description?: string | null,
): string | null {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  for (const [slug, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw.toLowerCase()))) return slug;
  }
  return null;
}
