import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { JobSnapshot } from "@/types";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock("@/components/home/dot-grid-bg", () => ({
  DotGridBg: () => <div data-testid="dot-grid-bg" />
}));

vi.mock("@/components/home/url-input-form", () => ({
  UrlInputForm: () => <button type="button">Start mocked job</button>
}));

vi.mock("@/components/shared/use-job-progress-controller", () => ({
  useJobProgressController: ({ initialSnapshot }: { initialSnapshot: JobSnapshot | null }) => ({
    snapshot: initialSnapshot,
    error: null,
    isRetrying: false,
    handleRetry: vi.fn(),
    setSnapshot: vi.fn()
  })
}));

describe("homepage idle state", () => {
  beforeEach(() => {
    pushMock.mockReset();
    window.sessionStorage.clear();
  });

  it("renders the hero state before any job is started", () => {
    render(<HomePage />);

    expect(screen.getByText(/turn any website into design\.md/i)).toBeInTheDocument();
    expect(screen.getByTestId("homepage-hero-shell")).toHaveAttribute("data-state", "visible");
    expect(screen.queryByTestId("generation-progress-card")).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
