import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NicknameForm, PasswordForm, DeleteAccountSection } from "../../features/auth/components/profile-client";

vi.mock("../../features/auth/server/profile-actions", () => ({
  updateNickname: vi.fn().mockResolvedValue({}),
  updatePassword: vi.fn().mockResolvedValue({}),
  deleteAccount: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => vi.clearAllMocks());

describe("NicknameForm", () => {
  it("현재 닉네임이 표시된다", () => {
    render(<NicknameForm currentNickname="devuser" />);
    expect(screen.getByText("devuser")).toBeInTheDocument();
  });
});

describe("PasswordForm", () => {
  it("현재/새/확인 비밀번호 필드가 렌더된다", () => {
    render(<PasswordForm />);
    expect(screen.getByLabelText("현재 비밀번호")).toBeInTheDocument();
    expect(screen.getByLabelText("새 비밀번호")).toBeInTheDocument();
    expect(screen.getByLabelText("새 비밀번호 확인")).toBeInTheDocument();
  });
});

describe("DeleteAccountSection", () => {
  it("탈퇴하기 버튼이 렌더된다", () => {
    render(<DeleteAccountSection />);
    expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeInTheDocument();
  });

  it("탈퇴 버튼 클릭 시 확인 다이얼로그가 열린다", () => {
    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    expect(screen.getByText(/정말 탈퇴/)).toBeInTheDocument();
  });
});
