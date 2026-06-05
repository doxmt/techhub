/**
 * schema.test.ts
 *
 * TDD Red 단계: apps/web/features/auth/server/schema.ts 가 아직 없으므로
 * "Cannot find module" 오류로 모든 테스트가 실패해야 한다.
 *
 * 구현 후 이 테스트가 전부 통과해야 2단계(Auth 인프라)가 완료된 것이다.
 */

import { describe, expect, it } from "vitest";

// @ts-expect-error 의도적 실패 — schema.ts 미존재
import { signUpSchema, signInSchema } from "./schema";

describe("signUpSchema", () => {
  it("유효한 이메일, 닉네임, 비밀번호를 통과시킨다", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      nickname: "devuser",
      password: "Password1!",
    });
    expect(result.success).toBe(true);
  });

  it("이메일 형식이 잘못된 경우 실패한다", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      nickname: "devuser",
      password: "Password1!",
    });
    expect(result.success).toBe(false);
  });

  it("이메일이 빈 문자열이면 실패한다", () => {
    const result = signUpSchema.safeParse({
      email: "",
      nickname: "devuser",
      password: "Password1!",
    });
    expect(result.success).toBe(false);
  });

  it("닉네임이 20자를 초과하면 실패한다", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      nickname: "a".repeat(21),
      password: "Password1!",
    });
    expect(result.success).toBe(false);
  });

  it("닉네임이 정확히 20자이면 통과한다", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      nickname: "a".repeat(20),
      password: "Password1!",
    });
    expect(result.success).toBe(true);
  });

  it("닉네임이 빈 문자열이면 실패한다", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      nickname: "",
      password: "Password1!",
    });
    expect(result.success).toBe(false);
  });

  it("비밀번호가 빈 문자열이면 실패한다", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      nickname: "devuser",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("필드가 누락되면 실패한다", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("유효한 이메일과 비밀번호를 통과시킨다", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "Password1!",
    });
    expect(result.success).toBe(true);
  });

  it("이메일 형식이 잘못된 경우 실패한다", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "Password1!",
    });
    expect(result.success).toBe(false);
  });

  it("비밀번호가 누락되면 실패한다", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("닉네임 필드가 포함되어도 통과한다 (잉여 필드 허용)", () => {
    // signIn에는 nickname이 없지만 strip 동작 검증
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "Password1!",
      nickname: "unexpected",
    });
    // Zod 기본 strip 동작: 통과하되 nickname은 결과에서 제거된다
    expect(result.success).toBe(true);
  });
});
