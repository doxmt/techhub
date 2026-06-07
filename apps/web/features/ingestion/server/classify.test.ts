/**
 * classify.test.ts
 *
 * classifyCategory(title, description): 키워드 기반 카테고리 슬러그 반환
 * - 제목/설명에 키워드 포함 시 해당 슬러그 반환
 * - 매칭 없으면 null 반환
 * - 대소문자 무관
 */

import { describe, expect, it } from "vitest";

// @ts-expect-error 의도적 실패 — classify.ts 미존재
import { classifyCategory } from "./classify";

describe("classifyCategory", () => {
  describe("프론트엔드(fe) 분류", () => {
    it("제목에 'React'가 있으면 'fe'를 반환한다", () => {
      expect(classifyCategory("React 성능 최적화 기법")).toBe("fe");
    });

    it("제목에 'TypeScript'가 있으면 'fe'를 반환한다", () => {
      expect(classifyCategory("TypeScript 5.0 새 기능")).toBe("fe");
    });

    it("제목에 '프론트엔드'가 있으면 'fe'를 반환한다", () => {
      expect(classifyCategory("프론트엔드 아키텍처 설계")).toBe("fe");
    });
  });

  describe("백엔드(be) 분류", () => {
    it("제목에 'Spring'이 있으면 'be'를 반환한다", () => {
      expect(classifyCategory("Spring Boot 3.0 마이그레이션")).toBe("be");
    });

    it("제목에 'Kotlin'이 있으면 'be'를 반환한다", () => {
      expect(classifyCategory("Kotlin 코루틴 완전 정복")).toBe("be");
    });

    it("제목에 'MySQL'이 있으면 'be'를 반환한다", () => {
      expect(classifyCategory("MySQL 인덱스 최적화")).toBe("be");
    });
  });

  describe("클라우드(cloud) 분류", () => {
    it("제목에 'AWS'가 있으면 'cloud'를 반환한다", () => {
      expect(classifyCategory("AWS Lambda 비용 최적화")).toBe("cloud");
    });

    it("제목에 'Kubernetes'가 있으면 'cloud'를 반환한다", () => {
      expect(classifyCategory("Kubernetes 배포 전략")).toBe("cloud");
    });

    it("제목에 'Docker'가 있으면 'cloud'를 반환한다", () => {
      expect(classifyCategory("Docker 멀티스테이지 빌드")).toBe("cloud");
    });
  });

  describe("AI 에이전트(ai-agents) 분류", () => {
    it("제목에 'LLM'이 있으면 'ai-agents'를 반환한다", () => {
      expect(classifyCategory("LLM 파인튜닝 실전 가이드")).toBe("ai-agents");
    });

    it("제목에 'RAG'가 있으면 'ai-agents'를 반환한다", () => {
      expect(classifyCategory("RAG 파이프라인 구축")).toBe("ai-agents");
    });
  });

  describe("claude-code 분류", () => {
    it("제목에 'Claude Code'가 있으면 'claude-code'를 반환한다", () => {
      expect(classifyCategory("Claude Code로 생산성 높이기")).toBe("claude-code");
    });

    it("제목에 'GitHub Copilot'이 있으면 'claude-code'를 반환한다", () => {
      expect(classifyCategory("GitHub Copilot 활용법")).toBe("claude-code");
    });
  });

  describe("도구(tools) 분류", () => {
    it("제목에 'Git'이 있으면 'tools'를 반환한다", () => {
      expect(classifyCategory("Git 브랜치 전략")).toBe("tools");
    });

    it("제목에 'ESLint'가 있으면 'tools'를 반환한다", () => {
      expect(classifyCategory("ESLint 커스텀 규칙 작성")).toBe("tools");
    });
  });

  describe("아키텍처(architecture) 분류", () => {
    it("제목에 '아키텍처'가 있으면 'architecture'를 반환한다", () => {
      expect(classifyCategory("마이크로서비스 아키텍처 전환기")).toBe("architecture");
    });

    it("제목에 'DDD'가 있으면 'architecture'를 반환한다", () => {
      expect(classifyCategory("DDD 도입 후기")).toBe("architecture");
    });
  });

  describe("커리어(career) 분류", () => {
    it("제목에 '이직'이 있으면 'career'를 반환한다", () => {
      expect(classifyCategory("이직 준비 6개월 회고")).toBe("career");
    });

    it("제목에 '면접'이 있으면 'career'를 반환한다", () => {
      expect(classifyCategory("개발자 면접 단골 질문")).toBe("career");
    });
  });

  describe("매칭 없음", () => {
    it("키워드가 없는 제목은 null을 반환한다", () => {
      expect(classifyCategory("아무 관련 없는 제목")).toBeNull();
    });

    it("빈 문자열은 null을 반환한다", () => {
      expect(classifyCategory("")).toBeNull();
    });
  });

  describe("description 활용", () => {
    it("제목에 키워드가 없어도 description에 있으면 분류한다", () => {
      expect(classifyCategory("개발 이야기", "React를 사용한 사례")).toBe("fe");
    });

    it("description이 null이어도 정상 동작한다", () => {
      expect(classifyCategory("React 개발 이야기", null)).toBe("fe");
    });

    it("description이 undefined이어도 정상 동작한다", () => {
      expect(classifyCategory("React 개발 이야기")).toBe("fe");
    });
  });

  describe("대소문자 무관", () => {
    it("소문자 'react'도 'fe'로 분류한다", () => {
      expect(classifyCategory("react 기초부터 심화까지")).toBe("fe");
    });

    it("대문자 'SPRING'도 'be'로 분류한다", () => {
      expect(classifyCategory("SPRING BOOT 입문")).toBe("be");
    });
  });
});
