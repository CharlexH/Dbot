import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe("home page", () => {
  it("renders the compact cold-toned hero shell", () => {
    const { container } = render(<HomePage />);
    const contentShell = container.querySelector('[data-testid="homepage-content-shell"]');
    const betaBadge = screen.getByText("Beta");
    const heroHeading = screen.getByRole("heading", { name: /turn any website into design\.md/i });
    const copyrightLink = screen.getByRole("link", { name: /© charlex\.me/i });
    const extractButton = screen.getByRole("button", { name: /extract/i });
    const formShell = container.querySelector('[data-testid="homepage-form-shell"]');

    expect(betaBadge).toBeInTheDocument();
    expect(heroHeading).toBeInTheDocument();
    expect(screen.getByText(/paste a url\. get a design system your agent can use\./i)).toBeInTheDocument();
    expect(betaBadge).toHaveClass("rounded-[8px]");
    expect(heroHeading).toHaveClass("text-[2rem]");
    expect(heroHeading).toHaveClass("md:text-[2.5rem]");
    expect(heroHeading).not.toHaveClass("text-4xl");
    expect(extractButton).toHaveClass("h-9");
    expect(formShell).toHaveClass("rounded-[10px]");
    expect(copyrightLink).toHaveAttribute("href", "https://charlex.me");
    expect(copyrightLink).toHaveClass("text-[11px]");
    expect(contentShell).toHaveClass("max-w-[680px]");
  });
});
