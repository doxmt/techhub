import { describe, expect, it } from "vitest";
import { classifyCategories } from "./classify";

describe("classifyCategories", () => {
  describe("프론트엔드(fe) 분류", () => {
    it("제목에 'React'가 있으면 fe를 포함한다", () => {
      expect(classifyCategories({ title: "React 성능 최적화 기법" })).toContain("fe");
    });

    it("제목에 'TypeScript'가 있으면 fe를 포함한다", () => {
      expect(classifyCategories({ title: "TypeScript 5.0 새 기능" })).toContain("fe");
    });

    it("제목에 '프론트엔드'가 있으면 fe를 포함한다", () => {
      expect(classifyCategories({ title: "프론트엔드 아키텍처 설계" })).toContain("fe");
    });
  });

  describe("백엔드(be) 분류", () => {
    it("제목에 'Spring'이 있으면 be를 포함한다", () => {
      expect(classifyCategories({ title: "Spring Boot 3.0 마이그레이션" })).toContain("be");
    });

    it("제목에 'Kotlin'이 있으면 be를 포함한다", () => {
      expect(classifyCategories({ title: "Kotlin 코루틴 완전 정복" })).toContain("be");
    });

    it("제목에 'MySQL'이 있으면 be를 포함한다", () => {
      expect(classifyCategories({ title: "MySQL 인덱스 최적화" })).toContain("be");
    });
  });

  describe("클라우드(cloud) 분류", () => {
    it("제목에 'AWS'가 있으면 cloud를 포함한다", () => {
      expect(classifyCategories({ title: "AWS Lambda 비용 최적화" })).toContain("cloud");
    });

    it("제목에 'Kubernetes'가 있으면 cloud를 포함한다", () => {
      expect(classifyCategories({ title: "Kubernetes 배포 전략" })).toContain("cloud");
    });

    it("제목에 'Docker'가 있으면 cloud를 포함한다", () => {
      expect(classifyCategories({ title: "Docker 멀티스테이지 빌드" })).toContain("cloud");
    });
  });

  describe("LLM/GenAI(llm) 분류", () => {
    it("제목에 'LLM'이 있으면 llm을 포함한다", () => {
      expect(classifyCategories({ title: "LLM 파인튜닝 실전 가이드" })).toContain("llm");
    });

    it("제목에 'RAG'가 있으면 llm을 포함한다", () => {
      expect(classifyCategories({ title: "RAG 파이프라인 구축" })).toContain("llm");
    });
  });

  describe("AI Agents(ai-agents) 분류", () => {
    it("제목에 'Claude Code'가 있으면 ai-agents를 포함한다", () => {
      expect(classifyCategories({ title: "Claude Code로 생산성 높이기" })).toContain("ai-agents");
    });

    it("제목에 'GitHub Copilot'이 있으면 ai-agents를 포함한다", () => {
      expect(classifyCategories({ title: "GitHub Copilot 활용법" })).toContain("ai-agents");
    });
  });

  describe("도구(tools) 분류", () => {
    it("제목에 'ESLint'가 있으면 tools를 포함한다", () => {
      expect(classifyCategories({ title: "ESLint 커스텀 규칙 작성" })).toContain("tools");
    });
  });

  describe("아키텍처(architecture) 분류", () => {
    it("제목에 'DDD'가 있으면 architecture를 포함한다", () => {
      expect(classifyCategories({ title: "DDD 도입 후기" })).toContain("architecture");
    });
  });

  describe("커리어(career) 분류", () => {
    it("제목에 '이직'이 있으면 career를 포함한다", () => {
      expect(classifyCategories({ title: "이직 준비 6개월 회고" })).toContain("career");
    });

    it("제목에 '면접'이 있으면 career를 포함한다", () => {
      expect(classifyCategories({ title: "개발자 면접 단골 질문" })).toContain("career");
    });
  });

  describe("매칭 없음", () => {
    it("키워드가 없는 제목은 빈 배열을 반환한다", () => {
      expect(classifyCategories({ title: "아무 관련 없는 제목" })).toHaveLength(0);
    });

    it("빈 문자열은 빈 배열을 반환한다", () => {
      expect(classifyCategories({ title: "" })).toHaveLength(0);
    });
  });

  describe("다중 카테고리", () => {
    it("최대 3개까지만 반환한다", () => {
      const result = classifyCategories({
        title: "React TypeScript Spring AWS LLM Docker Kubernetes",
      });
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("점수가 높은 카테고리가 앞에 온다", () => {
      const result = classifyCategories({
        title: "React React React",
        description: "Spring",
      });
      expect(result[0]).toBe("fe");
    });
  });

  describe("RSS 카테고리 가중치", () => {
    it("RSS 카테고리 매칭이 제목보다 높은 점수를 받는다", () => {
      const result = classifyCategories({
        title: "보안 관련 개발 이야기",
        rssCategories: ["security"],
      });
      expect(result).toContain("security");
    });

    it("rssCategories가 없어도 정상 동작한다", () => {
      expect(() => classifyCategories({ title: "React 개발 이야기" })).not.toThrow();
    });
  });

  describe("description 활용", () => {
    it("제목에 키워드가 없어도 description에 있으면 분류한다", () => {
      expect(classifyCategories({ title: "개발 이야기", description: "React를 사용한 사례" })).toContain("fe");
    });

    it("description이 null이어도 정상 동작한다", () => {
      expect(classifyCategories({ title: "React 개발 이야기", description: null })).toContain("fe");
    });
  });

  describe("대소문자 무관", () => {
    it("소문자 'react'도 fe로 분류한다", () => {
      expect(classifyCategories({ title: "react 기초부터 심화까지" })).toContain("fe");
    });

    it("대문자 'SPRING'도 be로 분류한다", () => {
      expect(classifyCategories({ title: "SPRING BOOT 입문" })).toContain("be");
    });
  });
});
