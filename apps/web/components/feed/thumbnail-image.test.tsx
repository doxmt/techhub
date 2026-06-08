import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThumbnailImage } from "./thumbnail-image";

describe("ThumbnailImage", () => {
  it("이미지를 정상 렌더링한다", () => {
    render(<ThumbnailImage src="https://example.com/img.png" alt="테스트" source="토스" />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("이미지 로드 실패 시 소스명 폴백을 표시한다", () => {
    const { container } = render(
      <ThumbnailImage src="https://example.com/img.png" alt="" source="네이버 D2" />,
    );
    const img = container.querySelector("img")!;
    fireEvent.error(img);
    expect(screen.getByText("네이버 D2")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
