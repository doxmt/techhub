import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthDialog } from "../../features/auth/components/auth-dialog";

vi.mock("../../features/auth/server/actions", () => ({
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  signUp: vi.fn().mockResolvedValue(undefined),
  toggleBookmark: vi.fn().mockResolvedValue({ bookmarked: true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthDialog", () => {
  it("open=true 이면 다이얼로그가 표시된다", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText("TechHub")).toBeInTheDocument();
  });

  it("open=false 이면 다이얼로그가 표시되지 않는다", () => {
    render(
      <AuthDialog open={false} onOpenChange={vi.fn()} />,
    );
    expect(screen.queryByText("TechHub")).not.toBeInTheDocument();
  });

  it("기본 탭은 로그인이다", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.queryByLabelText("닉네임")).not.toBeInTheDocument();
  });

  it("회원가입 탭으로 전환하면 닉네임 필드가 나타난다", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultTab="signup" />,
    );
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
  });

  it("탭 버튼 클릭으로 전환된다", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
  });
});
