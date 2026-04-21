import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { UrlInputForm } from "@/components/home/url-input-form";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("homepage chrome", () => {
  it("renders the homepage form without a divider between the url field and controls", () => {
    render(<UrlInputForm selectedPresetId="revolut" selectedCategory="Fintech" />);

    const controlsRow = screen.getByRole("button", { name: /extract/i }).parentElement;

    expect(controlsRow).not.toHaveClass("border-t");
  });

  it("renders the homepage form in a static shell without the interactive glow wrapper", () => {
    render(<UrlInputForm selectedPresetId="revolut" selectedCategory="Fintech" />);

    expect(screen.getByTestId("homepage-form-shell")).toBeInTheDocument();
    expect(screen.queryByTestId("homepage-form-glow")).not.toBeInTheDocument();
  });

  it("renders the model picker as a custom popup list and updates the selected label", async () => {
    const user = userEvent.setup();

    render(<UrlInputForm selectedPresetId="revolut" selectedCategory="Fintech" />);

    const trigger = screen.getByRole("button", { name: /gemini 3\.1 flash lite/i });

    await user.click(trigger);

    expect(screen.getByRole("listbox", { name: /model/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /gemini 3\.1 pro/i })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /gemini 3\.1 pro/i }));

    expect(screen.getByRole("button", { name: /gemini 3\.1 pro/i })).toBeInTheDocument();
    expect(screen.queryByRole("listbox", { name: /model/i })).not.toBeInTheDocument();
  });

  it("renders the website field as a two-line textarea that grows with content", async () => {
    render(<UrlInputForm selectedPresetId="revolut" selectedCategory="Fintech" />);

    const field = screen.getByLabelText(/website url/i);

    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAttribute("rows", "2");
    expect(field).toHaveClass("text-[14px]");

    Object.defineProperty(field, "scrollHeight", {
      configurable: true,
      value: 96
    });

    fireEvent.change(field, {
      target: {
        value: "https://linear.app/pricing\nhttps://linear.app/docs"
      }
    });

    await waitFor(() => {
      expect(field).toHaveStyle({ height: "96px" });
    });
  });

  it("does not keep blue hover borders or blue focus outlines in shared source", () => {
    const source = [
      "app/globals.css",
      "components/home/url-input-form.tsx",
      "components/home/style-card.tsx",
      "components/home/style-gallery.tsx",
      "components/workbench/workbench-shell.tsx",
    ]
      .map(readSource)
      .join("\n");

    expect(source).not.toMatch(/hover:border-accent/);
    expect(source).not.toMatch(/outline:\s*2px solid var\(--accent\)/);
  });
});
