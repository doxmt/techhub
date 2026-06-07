import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeaderUserMenu } from "../../features/auth/components/header-user-menu";

vi.mock("../../features/auth/server/actions", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe("HeaderUserMenu", () => {
  it("user가 null이면 로그인 버튼을 표시한다", () => {
    render(<HeaderUserMenu user={null} />);
    expect(screen.getByRole("button", { name: /로그인/ })).toBeInTheDocument();
  });

  it("user가 있으면 닉네임 첫 글자를 표시한다", () => {
    render(<HeaderUserMenu user={{ nickname: "테스터", email: "test@example.com" }} />);
    expect(screen.getByText("테")).toBeInTheDocument();
  });
});
