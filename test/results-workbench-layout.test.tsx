import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkbenchShell } from "@/components/workbench/workbench-shell";
import { fixtureRuns } from "@/lib/mocks";
import { MockRun } from "@/types";

function cloneRun(): MockRun {
  return structuredClone(fixtureRuns.singleExperience);
}

describe("results workbench layout", () => {
  it("stacks the cramped left-rail cards vertically and keeps provenance inline with the title row", () => {
    render(<WorkbenchShell run={cloneRun()} />);

    expect(screen.getByTestId("typography-card-header")).toHaveClass("sm:flex-row");
    expect(screen.getByTestId("buttons-card-header")).toHaveClass("sm:flex-row");
    expect(screen.getByTestId("typography-card-layout")).not.toHaveClass("lg:grid-cols-[1.08fr_0.92fr]");
    expect(screen.getByTestId("component-language-list")).not.toHaveClass("sm:grid-cols-2");
    expect(screen.getByTestId("usage-guidelines-list")).not.toHaveClass("sm:grid-cols-2");
  });

  it("keeps the sidebar card headers on a consistent inset rhythm", () => {
    render(<WorkbenchShell run={cloneRun()} />);

    const colorsSection = screen.getByRole("heading", { name: /^colors$/i }).closest("section");
    const visualDnaSection = screen.getByRole("heading", { name: /visual dna/i }).closest("section");
    const componentsSection = screen.getByRole("heading", { name: /^components$/i }).closest("section");

    expect(colorsSection).toHaveClass("p-3.5");
    expect(colorsSection).not.toHaveClass("p-2.5");
    expect(visualDnaSection).toHaveClass("p-3.5");
    expect(componentsSection).toHaveClass("p-3.5");
  });

  it("renders provenance tooltips outside the clipped sidebar panels", async () => {
    const user = userEvent.setup();

    render(<WorkbenchShell run={cloneRun()} />);

    const typographySection = screen.getByRole("heading", { name: /^typography$/i }).closest("section") as HTMLElement;
    const sourcePill = within(typographySection).getByText(/source: html/i);

    await user.hover(sourcePill);

    const tooltips = await screen.findAllByRole("tooltip");
    const [tooltip] = tooltips;

    expect(typographySection).toHaveClass("overflow-hidden");
    expect(tooltips).toHaveLength(1);
    expect(tooltip.closest("section")).toBeNull();
  });

  it("removes low-signal derived tag rails from the section cards", () => {
    render(<WorkbenchShell run={cloneRun()} />);

    expect(screen.queryByTestId("buttons-card-tags")).not.toBeInTheDocument();
    expect(screen.queryByTestId("icons-card-tags")).not.toBeInTheDocument();
    expect(screen.queryByTestId("motion-card-tags")).not.toBeInTheDocument();
    expect(screen.queryByTestId("rendering-card-tags")).not.toBeInTheDocument();
  });

  it("renders extracted svg icon samples instead of placeholder glyphs when icon evidence is available", () => {
    const run = cloneRun() as MockRun & {
      result: MockRun["result"] & {
        iconSamples?: Array<{
          label: string;
          svg: string;
        }>;
      };
    };

    run.result.iconSamples = [
      {
        label: "Circle",
        source: "crawl-browser",
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
      },
      {
        label: "Triangle",
        source: "crawl-browser",
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5 19 18H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
      },
      {
        label: "Spark",
        source: "crawl-browser",
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12 4 1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8Z" fill="currentColor"/></svg>'
      }
    ];
    run.result.derivedDesignSystem = undefined;

    render(<WorkbenchShell run={run} />);

    const iconSamples = within(screen.getByTestId("icons-card-samples")).getAllByRole("img", { name: /icon sample/i });

    expect(iconSamples).toHaveLength(3);
    expect(screen.queryByText("◯")).not.toBeInTheDocument();
    expect(screen.queryByText("⌁")).not.toBeInTheDocument();
  });
});
