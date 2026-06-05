import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("../../../lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

import { updateNickname, updatePassword, deleteAccount } from "./profile-actions";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

function makeClient(opts: {
  user?: { id: string; email: string } | null;
  updateError?: { message: string } | null;
  signInError?: { message: string } | null;
  updateUserError?: { message: string } | null;
}) {
  const { user = null, updateError = null, signInError = null, updateUserError = null } = opts;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: signInError }),
      updateUser: vi.fn().mockResolvedValue({ error: updateUserError }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      })),
    })),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("updateNickname", () => {
  it("비로그인 시 에러를 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ user: null }) as never);
    const fd = new FormData(); fd.set("nickname", "hello");
    const result = await updateNickname(fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("닉네임이 비어 있으면 에러를 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ user: { id: "u1", email: "a@b.com" } }) as never);
    const fd = new FormData(); fd.set("nickname", "");
    const result = await updateNickname(fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("닉네임이 20자 초과면 에러를 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ user: { id: "u1", email: "a@b.com" } }) as never);
    const fd = new FormData(); fd.set("nickname", "a".repeat(21));
    const result = await updateNickname(fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("정상 입력이면 성공한다", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ user: { id: "u1", email: "a@b.com" } }) as never);
    const fd = new FormData(); fd.set("nickname", "newname");
    const result = await updateNickname(fd);
    expect(result).toEqual({});
  });
});

describe("updatePassword", () => {
  it("비로그인 시 에러를 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ user: null }) as never);
    const fd = new FormData();
    fd.set("currentPassword", "Old1!pass");
    fd.set("newPassword", "New1!pass");
    fd.set("confirmPassword", "New1!pass");
    const result = await updatePassword(fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("새 비밀번호와 확인이 다르면 에러를 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ user: { id: "u1", email: "a@b.com" } }) as never);
    const fd = new FormData();
    fd.set("currentPassword", "Old1!pass");
    fd.set("newPassword", "New1!pass");
    fd.set("confirmPassword", "Different1!");
    const result = await updatePassword(fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("현재 비밀번호가 틀리면 에러를 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeClient({ user: { id: "u1", email: "a@b.com" }, signInError: { message: "wrong" } }) as never,
    );
    const fd = new FormData();
    fd.set("currentPassword", "Wrong1!pw");
    fd.set("newPassword", "New1!pass");
    fd.set("confirmPassword", "New1!pass");
    const result = await updatePassword(fd);
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("정상 입력이면 성공한다", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeClient({ user: { id: "u1", email: "a@b.com" } }) as never,
    );
    const fd = new FormData();
    fd.set("currentPassword", "Old1!pass");
    fd.set("newPassword", "New1!pass");
    fd.set("confirmPassword", "New1!pass");
    const result = await updatePassword(fd);
    expect(result).toEqual({});
  });
});

describe("deleteAccount", () => {
  it("비로그인 시 에러를 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ user: null }) as never);
    const result = await deleteAccount();
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("삭제 성공 시 에러 없이 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeClient({ user: { id: "u1", email: "a@b.com" } }) as never,
    );
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
    } as never);
    const result = await deleteAccount();
    expect(result).toBeUndefined();
  });
});
