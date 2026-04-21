import { describe, expect, it, vi } from "vitest";
import { advanceJob } from "@/lib/orchestration";
import { createJobRecord } from "@/lib/jobs";
import { JOB_STAGES } from "@/types";

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  });
}

describe("job orchestration", () => {
  it("discovers same-origin pages and ignores external links", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();

      switch (url) {
        case "https://acme.test":
          return html(`
            <html>
              <head><title>Acme Cloud</title></head>
              <body>
                <h1>Acme Cloud</h1>
                <p>Design systems for support teams.</p>
                <a href="/docs">Docs</a>
                <a href="/app">App</a>
                <a href="https://external.test/partner">Partner</a>
              </body>
            </html>
          `);
        case "https://acme.test/docs":
          return html(`
            <html>
              <head><title>Acme Docs</title></head>
              <body>
                <h1>Documentation</h1>
                <a href="/docs/getting-started">Getting Started</a>
              </body>
            </html>
          `);
        case "https://acme.test/app":
          return html("<html><head><title>Acme Workspace</title></head><body><h1>Workspace</h1></body></html>");
        case "https://acme.test/docs/getting-started":
          return html("<html><head><title>Acme Setup</title></head><body><h1>Getting Started</h1></body></html>");
        default:
          return html("<html><body>missing</body></html>", 404);
      }
    });

    const job = createJobRecord({
      url: "https://acme.test",
      selectedPresetIds: ["intercom"],
      selectedCategoryIds: ["SaaS"]
    });

    const advanced = await advanceJob(job, {
      fetchImpl: fetchMock,
      nowIso: "2026-04-09T15:05:00.000Z"
    });

    expect(advanced.status).toBe("running");
    expect(advanced.currentStage).toBe("Partition");
    expect(advanced.stages.find((stage) => stage.name === "Discover")).toMatchObject({
      status: "completed"
    });
    expect(advanced.evidence?.pages.map((page) => page.url)).toEqual([
      "https://acme.test",
      "https://acme.test/docs",
      "https://acme.test/app",
      "https://acme.test/docs/getting-started"
    ]);
  });

  it("fails the job when the root crawl cannot be fetched", async () => {
    const fetchMock = vi.fn(async () => html("<html><body>boom</body></html>", 503));
    const job = createJobRecord({
      url: "https://offline.test",
      selectedPresetIds: ["intercom"],
      selectedCategoryIds: ["SaaS"]
    });

    const advanced = await advanceJob(job, {
      fetchImpl: fetchMock,
      nowIso: "2026-04-09T15:05:00.000Z"
    });

    expect(advanced.status).toBe("failed");
    expect(advanced.currentStage).toBe("Discover");
    expect(advanced.failureMessage).toMatch(/discover/i);
    expect(advanced.result).toBeUndefined();
    expect(advanced.stages.find((stage) => stage.name === "Discover")).toMatchObject({
      status: "failed"
    });
  });

  it("classifies anti-bot challenge responses distinctly from generic 403 failures", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("<html><body>challenge</body></html>", {
        status: 403,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cf-mitigated": "challenge",
          server: "cloudflare"
        }
      })
    );
    const job = createJobRecord({
      url: "https://blocked.test",
      selectedPresetIds: ["intercom"],
      selectedCategoryIds: ["SaaS"]
    });

    const advanced = await advanceJob(job, {
      fetchImpl: fetchMock,
      nowIso: "2026-04-09T16:30:00.000Z"
    });

    expect(advanced.status).toBe("failed");
    expect(advanced.failureMessage).toContain("anti-bot challenge");
    expect(advanced.failureMessage).toContain("403");
  });

  it("derives palette, typography, and component previews from evidence hints before falling back", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();

      switch (url) {
        case "https://signals.test":
          return html(`
            <html>
              <head>
                <title>Signals Studio</title>
                <meta name="theme-color" content="#2D5BFF" />
                <style>
                  :root { --brand-ink: #101820; --brand-surface: #F4EFE8; }
                  body { font-family: "Inter", system-ui, sans-serif; color: #101820; background: #F4EFE8; }
                  h1 { font-family: "Fraunces", Georgia, serif; }
                </style>
              </head>
              <body>
                <h1>Evidence-led product design</h1>
                <p>Structured launch surfaces for product teams.</p>
                <a href="/docs">Docs</a>
                <a href="/app">App</a>
              </body>
            </html>
          `);
        case "https://signals.test/docs":
          return html(`
            <html>
              <head>
                <title>Signals Docs</title>
                <style>
                  body { font-family: "Inter", system-ui, sans-serif; }
                  .note { color: #6E7B8F; }
                </style>
              </head>
              <body>
                <h1>Implementation guides</h1>
                <p>API and setup walkthroughs.</p>
              </body>
            </html>
          `);
        case "https://signals.test/app":
          return html(`
            <html>
              <head><title>Signals Workspace</title></head>
              <body style="color:#101820;background:#F4EFE8;font-family:'Inter',system-ui,sans-serif;">
                <h1>Workspace overview</h1>
                <p>Team dashboards and operational controls.</p>
              </body>
            </html>
          `);
        default:
          return html("<html><body>missing</body></html>", 404);
      }
    });

    let job = createJobRecord({
      url: "https://signals.test",
      selectedPresetIds: ["intercom"],
      selectedCategoryIds: ["SaaS"]
    });

    for (const _stage of JOB_STAGES) {
      job = await advanceJob(job, {
        fetchImpl: fetchMock,
        nowIso: "2026-04-09T15:10:00.000Z"
      });
    }

    const layeredResult = job.result as typeof job.result & {
      provenanceVersion?: number;
      observed?: {
        palette?: { value?: unknown[] };
        typography?: { value?: unknown[] };
      };
      derived?: {
        sections?: { value?: Array<{ id: string }> };
      };
      synthesis?: {
        guidelines?: unknown;
      };
      compat?: {
        palette?: Array<{ value: string }>;
      };
    };

    expect(job.status).toBe("completed");
    expect(job.result?.palette.map((token) => token.value)).toEqual(
      expect.arrayContaining(["#2D5BFF", "#101820", "#F4EFE8"])
    );
    expect(job.result?.typography.find((token) => token.name === "Display")?.family).toContain("Fraunces");
    expect(job.result?.typography.find((token) => token.name === "Body")?.family).toContain("Inter");
    expect(job.result?.componentPreviews.map((preview) => preview.label)).toEqual([
      "Hero framing",
      "Documentation entry",
      "Workspace shell"
    ]);
    expect(job.result?.componentPreviews[1].detail).toContain("Implementation guides");
    expect(layeredResult?.provenanceVersion).toBe(1);
    expect(layeredResult?.observed?.palette).toBeTruthy();
    expect(layeredResult?.observed?.typography).toBeTruthy();
    expect(layeredResult?.derived?.sections?.value?.map((section) => section.id)).toEqual([
      "buttons",
      "icons",
      "spacing",
      "material",
      "motion",
      "rendering"
    ]);
    expect(layeredResult?.synthesis?.guidelines).toBeTruthy();
    expect(layeredResult?.compat?.palette?.map((token) => token.value)).toEqual(job.result?.palette.map((token) => token.value));
  });

  it("prefers browser observation over HTML-only signals when representative pages are available", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();

      switch (url) {
        case "https://browser-signals.test":
          return html(`
            <html>
              <head>
                <title>Browser Signals</title>
                <meta name="theme-color" content="#2D5BFF" />
                <style>
                  body { font-family: "Inter", system-ui, sans-serif; color: #101820; background: #F4EFE8; }
                  h1 { font-family: "Fraunces", Georgia, serif; }
                </style>
              </head>
              <body>
                <h1>Evidence-led product design</h1>
                <p>Structured launch surfaces for product teams.</p>
              </body>
            </html>
          `);
        default:
          return html("<html><body>missing</body></html>", 404);
      }
    });
    const observePages = vi.fn(async () => ({
      pages: [
        {
          url: "https://browser-signals.test",
          finalUrl: "https://browser-signals.test/app",
          pageRole: "root" as const,
          title: "Browser Signals App",
          cssVariables: {
            "--brand-ink": "rgb(11, 15, 25)",
            "--brand-surface": "rgb(250, 248, 244)",
            "--brand-accent": "rgb(0, 196, 180)"
          },
          typography: [
            {
              role: "heading" as const,
              selector: "h1",
              excerpt: "Evidence-led product design",
              family: "\"Instrument Serif\", serif",
              size: "64px",
              weight: "700",
              lineHeight: "72px",
              letterSpacing: "-0.04em",
              color: "rgb(11, 15, 25)"
            },
            {
              role: "body" as const,
              selector: "p",
              excerpt: "Structured launch surfaces for product teams.",
              family: "\"Suisse Intl\", system-ui, sans-serif",
              size: "16px",
              weight: "400",
              lineHeight: "24px",
              letterSpacing: "0em",
              color: "rgb(47, 60, 79)"
            }
          ],
          surfaces: [
            {
              kind: "card" as const,
              selector: ".hero-card",
              excerpt: "Hero card",
              backgroundColor: "rgb(250, 248, 244)",
              color: "rgb(11, 15, 25)",
              borderColor: "rgb(214, 220, 228)",
              borderRadius: "18px",
              boxShadow: "0 24px 80px rgba(11, 15, 25, 0.08)",
              padding: "24px 32px 24px 32px"
            }
          ]
        }
      ],
      warnings: []
    }));

    let job = createJobRecord({
      url: "https://browser-signals.test",
      selectedPresetIds: ["intercom"],
      selectedCategoryIds: ["SaaS"]
    });

    for (const _stage of JOB_STAGES) {
      job = await advanceJob(job, {
        fetchImpl: fetchMock,
        observePages,
        nowIso: "2026-04-17T01:00:00.000Z"
      });
    }

    expect(job.status).toBe("completed");
    expect(job.result?.observed.palette.source).toBe("crawl-browser");
    expect(job.result?.observed.typography.source).toBe("crawl-browser");
    expect(job.result?.site.canonicalUrl).toBe("https://browser-signals.test/app");
    expect(job.result?.typography[0].family).toContain("Instrument Serif");
    expect(job.result?.typography[1].family).toContain("Suisse Intl");
    expect(job.result?.palette.map((token) => token.value)).toEqual(
      expect.arrayContaining(["#0B0F19", "#FAF8F4", "#00C4B4"])
    );
  });
});
