import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockWorkbenchPage from "@/app/workbench/mock/page";

describe("mock workbench", () => {
  it("renders the curated design-system sidebar and export tabs from fixture data", () => {
    const { container } = render(<MockWorkbenchPage />);
    const shell = container.querySelector("main");
    const header = container.querySelector('[data-testid="results-header"]');
    const leftColumn = container.querySelector('[data-testid="results-primary-column"]');
    const activeExportTab = container.querySelector('[data-testid="export-tab-DESIGN.md"]');
    const homeLink = screen.getByRole("link", { name: /back/i });
    const pageFavicon = container.querySelector('[data-testid="results-site-favicon"]');

    expect(leftColumn).not.toBeNull();
    expect(shell).not.toBeNull();
    expect(header).not.toBeNull();
    expect(homeLink).toHaveAttribute("href", "/");
    expect(homeLink).toHaveClass("text-[13px]");
    expect(homeLink).not.toHaveClass("rounded-full");
    expect(homeLink).not.toHaveClass("border");
    expect(homeLink).not.toHaveClass("bg-panelAlt");
    expect(pageFavicon).not.toBeNull();
    expect(screen.queryByText(/results workbench/i)).not.toBeInTheDocument();
    expect(header).not.toHaveClass("rounded-panel");
    expect(header).not.toHaveClass("border");
    expect(header).not.toHaveClass("bg-panel");
    expect(header).not.toHaveClass("p-4");
    expect(header).not.toHaveClass("shadow-panel");
    expect(screen.getByRole("heading", { name: /^typography$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^colors$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /visual dna/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^components$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /component language/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^guidelines$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /usage guidelines/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /buttons/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /icons/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /spacing/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /material/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /motion/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /rendering/i })).toBeInTheDocument();
    expect(screen.getAllByText(/observed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/derived/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/synthesized/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/source:/i).length).toBeGreaterThan(0);
    const visualDnaSection = screen.getByRole("heading", { name: /visual dna/i }).closest("section");
    expect(screen.getByText(/heading system/i)).toBeInTheDocument();
    expect(screen.getByText(/body system/i)).toBeInTheDocument();
    expect(screen.getByText(/letters/i)).toBeInTheDocument();
    expect(screen.getByText(/numbers/i)).toBeInTheDocument();
    expect(screen.queryByText(/human view/i)).not.toBeInTheDocument();
    expect(visualDnaSection).not.toBeNull();
    expect(within(visualDnaSection as HTMLElement).queryByText("◔")).not.toBeInTheDocument();
    expect(within(leftColumn as HTMLElement).getAllByText(/^primary$/i).length).toBeGreaterThan(0);
    expect(within(leftColumn as HTMLElement).getAllByText(/^secondary$/i).length).toBeGreaterThan(0);
    expect(within(leftColumn as HTMLElement).getAllByText(/^tertiary$/i).length).toBeGreaterThan(0);
    expect(within(leftColumn as HTMLElement).getAllByText(/^neutral$/i).length).toBeGreaterThan(0);
    expect(within(leftColumn as HTMLElement).queryByRole("button", { name: /copy/i })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "DESIGN.md" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Design JSON" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tailwind v4" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "CSS Variables" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Design Tokens" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /partition appendix/i })).not.toBeInTheDocument();
    expect(shell).toHaveClass("gap-2");
    expect(shell).toHaveClass("p-4");
    expect(shell).not.toHaveClass("gap-5");
    expect(shell).not.toHaveClass("md:px-8");
    expect(shell).not.toHaveClass("md:py-9");
    expect(leftColumn).toHaveClass("space-y-1");
    expect(leftColumn).not.toHaveClass("space-y-4");
    expect(activeExportTab).toHaveClass("bg-accentSoft");
    expect(activeExportTab).toHaveClass("text-accent");
  });

  it("keeps the exports rail shrinkable so long agent output does not stretch the page", () => {
    const { container } = render(<MockWorkbenchPage />);

    const resultsColumns = container.querySelector('[data-testid="results-columns"]');
    const leftColumn = container.querySelector('[data-testid="results-primary-column"]');
    const rightColumn = container.querySelector('[data-testid="results-secondary-column"]');
    const exportsBody = container.querySelector('[data-testid="exports-code"]');
    const activeExportTab = container.querySelector('[data-testid="export-tab-DESIGN.md"]');

    expect(resultsColumns).toHaveClass("grid");
    expect(resultsColumns).toHaveClass("gap-2");
    expect(resultsColumns).toHaveClass("lg:grid-cols-3");
    expect(resultsColumns).not.toHaveClass("gap-6");
    expect(leftColumn).toHaveClass("min-w-0");
    expect(leftColumn).toHaveClass("lg:col-span-1");
    expect(leftColumn).toHaveClass("space-y-1");
    expect(rightColumn).toHaveClass("min-w-0");
    expect(rightColumn).toHaveClass("lg:col-span-2");
    expect(rightColumn).toHaveClass("space-y-2");
    expect(activeExportTab).toHaveClass("rounded-[8px]");
    expect(exportsBody).toHaveClass("max-w-full");
    expect(exportsBody).toHaveClass("whitespace-pre-wrap");
    expect(exportsBody).toHaveClass("break-words");
    expect(exportsBody).toHaveClass("p-4");
    expect(exportsBody).toHaveClass("text-[11px]");
    expect(exportsBody).not.toHaveClass("max-h-[600px]");
    expect(exportsBody).toHaveClass("overflow-auto");
  });

  it("applies token-level syntax highlighting to JSON export tabs", async () => {
    const user = userEvent.setup();

    render(<MockWorkbenchPage />);

    await user.click(screen.getByRole("tab", { name: "Design JSON" }));

    const exportCode = screen.getByTestId("exports-code");
    const designJsonMetaKey = within(exportCode).getAllByText('"meta"')[0];
    const designJsonConfidenceValue = within(exportCode).getAllByText('"medium"')[0];
    const designJsonEmptyArray = within(exportCode).getAllByText("[]")[0];

    expect(designJsonMetaKey).toHaveStyle({ color: "rgb(147, 197, 253)" });
    expect(designJsonConfidenceValue).toHaveStyle({ color: "rgb(122, 162, 255)" });
    expect(designJsonEmptyArray).toHaveStyle({ color: "rgb(100, 116, 139)" });

    await user.click(screen.getByRole("tab", { name: "Design Tokens" }));

    const designTokensColorKey = within(exportCode).getAllByText('"color"')[0];
    const designTokensPrimaryInkKey = within(exportCode).getByText('"midnight-ink"');
    const designTokensColorValue = within(exportCode).getByText('"#191C1F"');

    expect(designTokensColorKey).toHaveStyle({ color: "rgb(147, 197, 253)" });
    expect(designTokensPrimaryInkKey).toHaveStyle({ color: "rgb(147, 197, 253)" });
    expect(designTokensColorValue).toHaveStyle({ color: "rgb(122, 162, 255)" });
  });
});
