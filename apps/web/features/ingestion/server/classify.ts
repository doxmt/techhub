const KEYWORDS: Record<string, string[]> = {
  fe: [
    // Korean
    "프론트엔드", "프론트", "렌더링", "브라우저", "웹 성능",
    // Frameworks/Libraries
    "React", "리액트", "Vue", "Vue.js", "뷰", "Angular", "앵귤러",
    "Next.js", "Nextjs", "Nuxt", "Nuxt.js", "Svelte", "스벨트",
    "Remix", "Astro",
    // Languages & tooling
    "JavaScript", "JS", "자바스크립트", "TypeScript", "TS", "타입스크립트",
    "CSS", "Sass", "SCSS", "Tailwind", "테일윈드", "Styled Components",
    "HTML", "DOM",
    // Bundlers
    "Webpack", "웹팩", "Vite", "비트", "esbuild", "Rollup",
    // State management
    "Zustand", "Redux", "리덕스", "Recoil", "Jotai", "MobX",
    // Patterns & concepts
    "SSR", "Server-Side Rendering", "서버 사이드 렌더링",
    "CSR", "Client-Side Rendering", "클라이언트 사이드 렌더링",
    "SSG", "Static Site Generation", "정적 사이트 생성",
    "ISR", "Incremental Static Regeneration",
    "Web Vitals", "Core Web Vitals", "LCP", "CLS", "FID", "INP",
    "PWA", "Progressive Web App", "프로그레시브 웹 앱",
    "SPA", "Single Page Application", "단일 페이지 앱",
    "Micro Frontend", "마이크로 프론트엔드",
    // UI
    "UI/UX", "Storybook", "스토리북",
  ],

  be: [
    // Korean
    "백엔드", "백앤드", "서버", "서버 개발",
    // Languages
    "Java", "자바", "Kotlin", "코틀린",
    "Go", "Golang", "고언어", "고랭",
    "Python", "파이썬",
    "Node.js", "NodeJS", "노드", "노드제이에스",
    "Rust", "러스트",
    // Frameworks
    "Spring", "스프링", "Spring Boot", "스프링부트",
    "Express", "NestJS", "Nest.js",
    "Django", "장고", "FastAPI", "Flask", "플라스크",
    "Ktor", "Gin", "Echo", "Fiber",
    // APIs
    "REST API", "REST", "RESTful", "레스트",
    "GraphQL", "그래프큐엘",
    "gRPC", "Protocol Buffers", "Protobuf",
    "WebSocket", "웹소켓",
    // Databases
    "MySQL", "마이에스큐엘", "PostgreSQL", "Postgres", "포스트그레스",
    "MongoDB", "몽고디비", "Redis", "레디스",
    "Elasticsearch", "엘라스틱서치",
    "Kafka", "카프카", "RabbitMQ",
    // ORM & persistence
    "JPA", "Hibernate", "하이버네이트", "ORM",
    // Architecture
    "JVM", "마이크로서비스", "Microservice", "Backend", "Server",
    "API Gateway", "API 게이트웨이",
    "메시지 큐", "Message Queue", "MQ",
  ],

  mobile: [
    // Korean
    "모바일", "앱", "앱 개발", "모바일 앱", "네이티브 앱",
    // Platforms
    "iOS", "아이오에스", "아이폰",
    "Android", "안드로이드",
    // Languages & frameworks
    "Swift", "스위프트", "SwiftUI", "UIKit",
    "Jetpack Compose", "Compose", "컴포즈",
    "Flutter", "플러터", "Dart", "다트",
    "React Native", "리액트 네이티브", "RN",
    "Kotlin Multiplatform", "KMP",
    // Tools
    "Xcode", "엑스코드", "Android Studio", "안드로이드 스튜디오",
    // Concepts
    "크로스플랫폼", "Cross-platform", "Cross Platform",
    "앱스토어", "App Store", "Google Play", "플레이스토어",
    "푸시 알림", "Push Notification", "FCM", "APNs",
  ],

  cloud: [
    // Korean
    "클라우드", "인프라", "인프라스트럭처", "서버리스",
    // Providers
    "AWS", "Amazon Web Services", "아마존 웹 서비스",
    "GCP", "Google Cloud", "Google Cloud Platform", "구글 클라우드",
    "Azure", "Microsoft Azure", "마이크로소프트 애저",
    // Container & orchestration
    "Kubernetes", "K8s", "쿠버네티스",
    "Docker", "도커", "컨테이너",
    "Helm", "헬름", "ArgoCD", "Argo CD",
    // DevOps
    "DevOps", "데브옵스",
    "CI/CD", "지속적 통합", "지속적 배포",
    "Continuous Integration", "Continuous Deployment", "Continuous Delivery",
    "GitOps", "깃옵스",
    // IaC
    "Terraform", "테라폼",
    "IaC", "Infrastructure as Code", "코드형 인프라",
    "AWS CDK", "CloudFormation", "Pulumi",
    // AWS services
    "EKS", "ECS", "EC2", "Lambda", "람다", "S3", "RDS",
    "CloudFront", "Route53",
    // Concepts
    "Serverless", "서버리스",
    "Nginx", "엔진엑스", "Load Balancer", "로드밸런서",
    "Infrastructure", "Cloud", "SRE", "Site Reliability Engineering", "사이트 신뢰성 엔지니어링",
    "Auto Scaling", "오토스케일링",
  ],

  data: [
    // Korean
    "데이터 파이프라인", "데이터 엔지니어링", "데이터 플랫폼",
    "데이터 웨어하우스", "데이터 레이크", "데이터 마트",
    "실시간 처리", "배치 처리", "데이터 분석",
    // Frameworks & tools
    "Apache Spark", "Spark", "스파크",
    "Apache Airflow", "Airflow", "에어플로우",
    "Apache Flink", "Flink", "플링크",
    "Apache Kafka", "Kafka", "카프카",
    "dbt", "Data Build Tool",
    "Databricks", "데이터브릭스",
    // Data warehouses
    "BigQuery", "빅쿼리",
    "Redshift", "Amazon Redshift",
    "Snowflake", "스노우플레이크",
    // Concepts
    "ETL", "Extract Transform Load",
    "ELT", "Extract Load Transform",
    "Data Warehouse", "DW", "Data Lake",
    "Data Pipeline", "Data Engineering", "Data Platform",
    "Streaming", "스트리밍",
    "Analytics", "분석", "BI", "Business Intelligence", "비즈니스 인텔리전스",
    "Tableau", "Looker", "Superset",
    "데이터 거버넌스", "Data Governance",
  ],

  security: [
    // Korean
    "보안", "사이버 보안", "취약점", "취약성", "인증", "인가",
    "암호화", "복호화", "개인정보", "접근 제어",
    // Vulnerabilities
    "XSS", "Cross-Site Scripting", "크로스 사이트 스크립팅",
    "SQL Injection", "SQL 인젝션", "SQL 주입",
    "CSRF", "Cross-Site Request Forgery",
    "SSRF", "XXE",
    "CVE", "Common Vulnerabilities and Exposures",
    // Auth
    "JWT", "JSON Web Token", "제이더블유티",
    "OAuth", "OAuth2", "오어스",
    "OIDC", "OpenID Connect",
    "SSO", "Single Sign-On", "싱글 사인온",
    "MFA", "2FA", "이중 인증",
    // Network
    "HTTPS", "TLS", "SSL", "인증서",
    "WAF", "Web Application Firewall",
    "방화벽", "Firewall", "DDoS",
    // Concepts
    "Zero Trust", "제로 트러스트",
    "암호화", "Encryption", "복호화", "Decryption",
    "Security", "Cybersecurity",
    "침투 테스트", "Penetration Testing", "Pentest", "모의해킹",
    "OWASP", "개인정보보호", "Privacy", "GDPR", "PIPA",
    "보안 감사", "Security Audit",
  ],

  architecture: [
    // Korean
    "아키텍처", "아키텍쳐", "시스템 설계", "소프트웨어 설계",
    "설계 원칙", "확장성", "분산 시스템",
    // Patterns
    "DDD", "Domain-Driven Design", "도메인 주도 개발", "도메인 주도 설계",
    "CQRS", "Command Query Responsibility Segregation",
    "Event Sourcing", "이벤트 소싱",
    "Event-Driven", "이벤트 드리븐", "이벤트 기반",
    "Clean Architecture", "클린 아키텍처",
    "Hexagonal Architecture", "헥사고날", "Ports and Adapters",
    "Layered Architecture", "레이어드 아키텍처",
    "Design Pattern", "디자인 패턴", "Pattern", "패턴",
    "SOLID", "SOA", "Service-Oriented Architecture",
    // Scale
    "MSA", "Microservice Architecture", "마이크로서비스 아키텍처",
    "Monolith", "모놀리식", "모놀리스",
    "Modular Monolith", "모듈러 모놀리스",
    // Concepts
    "System Design", "Architecture", "분산 시스템", "Distributed System",
    "Scalability", "확장성", "High Availability", "고가용성",
    "Fault Tolerance", "장애 허용", "Resilience",
    "리팩토링", "Refactoring",
  ],

  performance: [
    // Korean
    "성능", "최적화", "성능 최적화", "속도 개선", "병목", "병목 현상",
    "응답시간", "지연시간",
    // Profiling
    "프로파일링", "Profiling", "프로파일러", "Profiler",
    "APM", "Application Performance Monitoring",
    // Metrics
    "Latency", "레이턴시", "지연",
    "Throughput", "처리량", "처리속도",
    "Benchmark", "벤치마크", "벤치마킹",
    // Optimization techniques
    "튜닝", "Tuning", "쿼리 최적화", "Query Optimization",
    "인덱스", "Index", "인덱싱", "Indexing",
    "캐싱", "Caching", "Cache", "캐시",
    "CDN", "Content Delivery Network", "콘텐츠 전송 네트워크",
    // Issues
    "Memory Leak", "메모리 누수",
    "GC", "Garbage Collection", "가비지 컬렉션",
    "Bottleneck", "병목",
    // Testing
    "부하 테스트", "Load Testing", "Load Test",
    "스트레스 테스트", "Stress Test",
    "Performance", "Optimization",
  ],

  testing: [
    // Korean
    "테스트", "테스팅", "테스트 전략", "테스트 코드", "품질 보증",
    "단위 테스트", "통합 테스트", "회귀 테스트",
    // Methodologies
    "TDD", "Test-Driven Development", "테스트 주도 개발",
    "BDD", "Behavior-Driven Development", "행동 주도 개발",
    // Test types
    "Unit Test", "Unit Testing", "유닛 테스트",
    "Integration Test", "Integration Testing",
    "E2E", "End-to-End", "End to End", "엔드투엔드",
    "Regression Test", "Regression Testing",
    // QA
    "QA", "Quality Assurance", "품질 보증",
    "테스트 커버리지", "Test Coverage", "Code Coverage",
    // Tools
    "Jest", "제스트", "Vitest",
    "JUnit", "제이유닛", "TestNG",
    "Pytest", "unittest",
    "Playwright", "플레이라이트",
    "Cypress", "사이프레스",
    "Selenium", "셀레니움",
    "Mock", "Mocking", "모킹", "Stub", "Fake",
    "Testing", "Test",
  ],

  ml: [
    // Korean
    "머신러닝", "딥러닝", "기계학습", "신경망", "인공신경망",
    "모델 학습", "학습 데이터", "데이터 전처리", "피처 엔지니어링",
    "추천 시스템", "분류", "회귀", "클러스터링", "강화학습",
    "자연어처리", "컴퓨터 비전",
    // Frameworks
    "PyTorch", "파이토치", "TensorFlow", "텐서플로우", "TF",
    "Keras", "케라스", "JAX",
    "Scikit-learn", "sklearn", "사이킷런",
    "XGBoost", "LightGBM", "CatBoost",
    // Concepts
    "Machine Learning", "ML",
    "Deep Learning", "DL",
    "Neural Network", "뉴럴 네트워크",
    "CNN", "Convolutional Neural Network", "합성곱 신경망",
    "RNN", "Recurrent Neural Network", "순환 신경망",
    "LSTM", "GRU",
    "Transformer", "트랜스포머",
    "Attention", "어텐션",
    "Reinforcement Learning", "RL",
    "NLP", "Natural Language Processing",
    "Computer Vision", "CV",
    // MLOps
    "MLOps", "ML 파이프라인", "ML Pipeline",
    "모델 서빙", "Model Serving", "모델 배포", "Model Deployment",
    "Feature Store", "피처 스토어",
    "Recommendation System", "Recommender",
  ],

  llm: [
    // Korean
    "거대 언어 모델", "대규모 언어 모델", "거대언어모델",
    "생성형 AI", "생성형 인공지능",
    "프롬프트", "프롬프트 엔지니어링",
    "파인튜닝", "임베딩", "벡터 검색",
    "할루시네이션", "환각", "컨텍스트 윈도우",
    // Models
    "LLM", "Large Language Model",
    "GPT", "GPT-4", "GPT-4o", "ChatGPT",
    "Claude", "Claude 3", "claude-3",
    "Gemini", "Bard",
    "Llama", "Llama2", "Llama3", "Meta AI",
    "Mistral", "Mixtral",
    "Qwen", "DeepSeek",
    // Concepts
    "GenAI", "Generative AI",
    "RAG", "Retrieval Augmented Generation", "검색 증강 생성",
    "Embedding", "Vector DB", "벡터 DB", "벡터 데이터베이스",
    "Fine-tuning", "PEFT", "LoRA", "QLoRA",
    "Prompt", "Prompt Engineering",
    "Foundation Model", "파운데이션 모델",
    "Context Window", "Hallucination",
    "RLHF", "Instruction Tuning",
    "Multimodal", "멀티모달",
    "Tokenizer", "토크나이저",
    "Hugging Face", "허깅페이스",
    "LLMOps",
  ],

  "ai-agents": [
    // Korean
    "에이전트", "AI 에이전트", "자율 에이전트", "코딩 에이전트",
    "멀티 에이전트", "에이전틱",
    // Frameworks
    "LangChain", "랭체인",
    "LangGraph", "랭그래프",
    "LlamaIndex", "CrewAI", "AutoGen", "AutoGPT",
    // Protocols & tools
    "MCP", "Model Context Protocol",
    "Tool Use", "Function Calling", "도구 사용",
    // Coding agents
    "Claude Code", "Cursor", "커서",
    "GitHub Copilot", "Copilot", "코파일럿",
    "Devin", "Codeium", "Windsurf",
    // Concepts
    "AI Agent", "Agentic", "Multi-agent",
    "Autonomous", "자율", "Orchestration", "오케스트레이션",
    "Workflow Automation", "워크플로우 자동화",
    "ReAct", "Chain of Thought", "CoT",
    "Planning", "플래닝",
  ],

  "open-source": [
    // Korean
    "오픈소스", "오픈 소스", "기여", "컨트리뷰션", "컨트리뷰트",
    "릴리즈 노트", "커뮤니티", "메인테이너", "라이선스",
    // English
    "Open Source", "opensource",
    "Contribution", "Contributing",
    "Release Notes", "Changelog", "CHANGELOG",
    "Community", "Maintainer",
    "MIT License", "Apache License",
    "Pull Request 기여",
    "GitHub Stars",
    "라이브러리 배포", "패키지 배포", "Library Release", "Package Release",
  ],

  tools: [
    // Korean
    "개발 환경", "개발자 경험", "생산성", "도구", "빌드 도구",
    "패키지 매니저", "린터", "포매터",
    // Version control
    "Git", "깃", "GitHub Actions", "깃허브 액션",
    // Editors
    "VS Code", "VSCode", "비에스코드",
    "IntelliJ", "인텔리제이", "JetBrains",
    "Vim", "Neovim", "Emacs",
    // Package managers
    "pnpm", "npm", "yarn", "Bun",
    "pip", "Poetry", "uv",
    "Maven", "Gradle",
    // Code quality
    "ESLint", "Prettier", "Biome",
    "SonarQube", "소나큐브",
    // Build & monorepo
    "Turborepo", "Nx", "Lerna",
    "Monorepo", "모노레포",
    "Makefile", "Task runner",
    // Concepts
    "DX", "Developer Experience", "개발자 경험",
    "터미널", "Terminal", "Shell", "쉘",
    "Productivity", "Tooling", "생산성",
    "Homebrew",
  ],

  career: [
    // Korean
    "커리어", "이직", "이직 준비", "면접", "기술 면접",
    "성장", "회고", "회고록", "조직", "문화", "개발 문화",
    "조직 문화", "협업", "멘토링", "온보딩", "리더십",
    "스타트업", "번아웃",
    // English
    "Career", "Job Change",
    "Interview", "Technical Interview",
    "Growth", "Retrospective",
    "Organization", "Culture", "Team", "팀",
    "OKR", "Objectives and Key Results",
    "Leadership", "Onboarding",
    "Startup", "Burnout",
    "Collaboration", "Mentoring",
    "Work-Life Balance", "워라밸",
    "개발자 성장", "시니어", "주니어",
  ],

  game: [
    // Korean
    "게임", "게임 개발", "게임 서버", "게임 클라이언트", "게임 엔진",
    "게임 플레이", "게임 로직", "게임 물리", "게임 그래픽",
    "렌더링 엔진", "게임 최적화", "게임 네트워크",
    // English
    "Game", "Game Development", "Game Engine", "Game Server",
    "Game Client", "Gameplay", "Game Logic", "Game Physics",
    "Unity", "유니티", "Unreal", "언리얼", "Unreal Engine",
    "DirectX", "OpenGL", "Vulkan", "Metal",
    "Shader", "셰이더", "Rendering Pipeline", "렌더링 파이프라인",
    "Game Design", "게임 디자인",
    "MMORPG", "MMO", "FPS", "RTS", "RPG",
    "GameDev", "Godot",
  ],
};

export function classifyCategories({
  title,
  description,
  rssCategories = [],
}: {
  title: string;
  description?: string | null;
  rssCategories?: string[];
}): string[] {
  const titleText = title.toLowerCase();
  const descText = (description ?? "").toLowerCase();
  const rssText = rssCategories.join(" ").toLowerCase();

  const scores: { slug: string; score: number }[] = [];

  for (const [slug, keywords] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (rssText.includes(kwLower)) score += 10;
      if (titleText.includes(kwLower)) score += 3;
      if (descText.includes(kwLower)) score += 1;
    }
    if (score > 0) scores.push({ slug, score });
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.slug);
}
