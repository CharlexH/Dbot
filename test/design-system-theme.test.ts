import fs from "node:fs/promises";

describe("design-system theme source", () => {
  it("uses shared cold-system tokens and removes legacy warm workbench tokens", async () => {
    const globalsCss = await fs.readFile("/Users/charlex/Documents/Dbot/app/globals.css", "utf8");
    const workbenchShell = await fs.readFile("/Users/charlex/Documents/Dbot/components/workbench/workbench-shell.tsx", "utf8");

    expect(globalsCss).toContain("--danger:");
    expect(globalsCss).toContain("--info:");
    expect(globalsCss).not.toContain("--warning:");
    expect(globalsCss).not.toContain("--workbench-sidebar-");

    expect(workbenchShell).not.toContain("workbench-sidebar");
    expect(workbenchShell).not.toContain("amber-");
    expect(workbenchShell).not.toContain("#f3efe8");
    expect(workbenchShell).not.toContain("#b1734f");
  });
});
