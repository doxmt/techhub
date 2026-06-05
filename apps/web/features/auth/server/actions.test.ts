/**
 * actions.test.ts
 *
 * TDD Red 단계: apps/web/features/auth/server/actions.ts 가 아직 없으므로
 * "Cannot find module" 오류로 모든 테스트가 실패해야 한다.
 *
 * signUp, signInWithPassword, signOut Server Actions를 대상으로 한다.
 * Supabase auth 클라이언트를 mock해서 외부 의존성을 제거한다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// next/headers의 revalidatePath/redirect는 Server Action 내부에서 호출된다.
// Vitest(jsdom) 환경에서는 존재하지 않으므로 mock 처리한다.
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

// @ts-expect-error 의도적 실패 — actions.ts 미존재
import { signUp, signInWithPassword, signOut } from "./actions";

import { createClient } from "../../../lib/supabase/server";

function makeAuthMock(result: {
  data?: unknown;
  error?: { message: string } | null;
}) {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue(result),
      signInWithPassword: vi.fn().mockResolvedValue(result),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

describe("signUp", () => {
  it("유효한 입력으로 Supabase signUp을 호출한다", async () => {
    const mockClient = makeAuthMock({ data: { user: { id: "uuid-1" } }, error: null });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "newuser@example.com");
    formData.set("nickname", "newuser");
    formData.set("password", "Secure1!");

    await signUp(formData);

    expect(mockClient.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "newuser@example.com",
        password: "Secure1!",
      }),
    );
  });

  it("Zod 검증 실패 시 Supabase signUp을 호출하지 않는다", async () => {
    const mockClient = makeAuthMock({ data: null, error: null });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "not-an-email");
    formData.set("nickname", "u");
    formData.set("password", "pw");

    const result = await signUp(formData);

    expect(mockClient.auth.signUp).not.toHaveBeenCalled();
    // 오류 메시지를 담은 객체를 반환하거나 throw한다
    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("닉네임이 21자이면 Supabase signUp을 호출하지 않는다", async () => {
    const mockClient = makeAuthMock({ data: null, error: null });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("nickname", "a".repeat(21));
    formData.set("password", "Secure1!");

    await signUp(formData);

    expect(mockClient.auth.signUp).not.toHaveBeenCalled();
  });

  it("Supabase에서 오류가 반환되면 에러 결과를 반환한다", async () => {
    const mockClient = makeAuthMock({
      data: null,
      error: { message: "User already registered" },
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "exists@example.com");
    formData.set("nickname", "dupuser");
    formData.set("password", "Secure1!");

    const result = await signUp(formData);

    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("signUp 성공 시 에러 없는 결과를 반환한다", async () => {
    const mockClient = makeAuthMock({
      data: { user: { id: "uuid-new" }, session: null },
      error: null,
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "fresh@example.com");
    formData.set("nickname", "freshuser");
    formData.set("password", "Secure1!");

    const result = await signUp(formData);

    expect(result?.error).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// signInWithPassword
// ---------------------------------------------------------------------------

describe("signInWithPassword", () => {
  it("유효한 이메일·비밀번호로 Supabase signInWithPassword를 호출한다", async () => {
    const mockClient = makeAuthMock({
      data: { user: { id: "uuid-1" }, session: { access_token: "tok" } },
      error: null,
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "mypassword");

    await signInWithPassword(formData);

    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "admin@example.com",
        password: "mypassword",
      }),
    );
  });

  it("이메일 형식이 잘못된 경우 Supabase 호출 없이 에러를 반환한다", async () => {
    const mockClient = makeAuthMock({ data: null, error: null });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "bad-email");
    formData.set("password", "mypassword");

    const result = await signInWithPassword(formData);

    expect(mockClient.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("잘못된 비밀번호로 Supabase가 오류를 반환하면 에러 결과를 반환한다", async () => {
    const mockClient = makeAuthMock({
      data: null,
      error: { message: "Invalid login credentials" },
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "wrongpassword");

    const result = await signInWithPassword(formData);

    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("로그인 성공 시 에러 없는 결과를 반환한다", async () => {
    const mockClient = makeAuthMock({
      data: { user: { id: "uuid-1" }, session: { access_token: "tok" } },
      error: null,
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "Correct1!");

    const result = await signInWithPassword(formData);

    expect(result?.error).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe("signOut", () => {
  it("Supabase signOut을 호출한다", async () => {
    const mockClient = makeAuthMock({ data: null, error: null });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    await signOut();

    expect(mockClient.auth.signOut).toHaveBeenCalled();
  });

  it("signOut 후 오류 없이 완료된다", async () => {
    const mockClient = makeAuthMock({ data: null, error: null });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    await expect(signOut()).resolves.not.toThrow();
  });
});
