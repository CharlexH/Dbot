import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GET as getJob } from "@/app/api/jobs/[jobId]/route";
import { POST as createJob } from "@/app/api/jobs/route";
import { createFileJobRepository, createJobRecord } from "@/lib/jobs";
import { EXPORT_TABS, JOB_STAGES } from "@/types";

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  });
}

describe("job api", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dbot-api-"));
    process.env.DBOT_RUNTIME_FILE = path.join(tempDir, "jobs.json");
  });

  afterEach(async () => {
    delete process.env.DBOT_RUNTIME_FILE;
    delete process.env.DBOT_GEMINI_API_KEY;
    vi.unstubAllGlobals();
    vi.useRealTimers();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("creates a job and returns a job-backed results route", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T15:00:00.000Z"));

    const response = await createJob(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://revolut.com",
          selectedPresetIds: ["revolut"],
          selectedCategoryIds: ["Fintech"]
        })
      })
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.jobId).toMatch(/^job_/);
    expect(body.route).toBe(`/results/${body.jobId}`);
  });

  it("accepts a client-submitted Gemini key even when a server-side key is configured", async () => {
    process.env.DBOT_GEMINI_API_KEY = "server-side-key";

    const response = await createJob(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://revolut.com",
          selectedPresetIds: ["revolut"],
          selectedCategoryIds: ["Fintech"],
          geminiApiKey: "client-key",
          geminiModel: "gemini-3-flash-preview"
        })
      })
    );

    const body = await response.json();
    const repository = createFileJobRepository(process.env.DBOT_RUNTIME_FILE!);
    const persisted = await repository.findById(body.jobId);

    expect(response.status).toBe(201);
    expect(body.snapshot.job.geminiApiKey).toBe("client-key");
    expect(body.snapshot.job.geminiModel).toBe("gemini-3-flash-preview");
    expect(persisted?.geminiApiKey).toBe("client-key");
    expect(persisted?.geminiModel).toBe("gemini-3-flash-preview");
  });

  it("advances a queued job to completion across repeated reads using crawled evidence", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();

      switch (url) {
        case "https://acme.test":
          return html(`
            <html>
              <head><title>Acme Cloud</title></head>
              <body>
                <h1>Acme Cloud</h1>
                <p>Calm enterprise support tooling.</p>
                <a href="/docs">Docs</a>
                <a href="/pricing">Pricing</a>
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
        case "https://acme.test/pricing":
          return html("<html><head><title>Acme Pricing</title></head><body><h1>Pricing</h1></body></html>");
        case "https://acme.test/docs/getting-started":
          return html("<html><head><title>Acme Setup</title></head><body><h1>Getting Started</h1></body></html>");
        default:
          return html("<html><body>missing</body></html>", 404);
      }
    });

    vi.stubGlobal("fetch", fetchMock);

    const createResponse = await createJob(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://acme.test",
          selectedPresetIds: ["intercom"],
          selectedCategoryIds: ["SaaS"]
        })
      })
    );
    const created = await createResponse.json();

    let body: Awaited<ReturnType<Response["json"]>> | undefined;

    for (const _stage of JOB_STAGES) {
      const response = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}`), {
        params: { jobId: created.jobId }
      });

      body = await response.json();
      expect(response.status).toBe(200);
    }

    expect(body?.job.status).toBe("completed");
    expect(body?.result.site.title).toBe("Acme Cloud");
    expect(body?.result.site.domain).toBe("acme.test");
    expect(body?.job.evidence.pages.map((page: { url: string }) => page.url)).toContain("https://acme.test/docs/getting-started");
    expect(body?.result.exports.map((artifact: { tab: string }) => artifact.tab)).toEqual(EXPORT_TABS);
    expect(body?.result.includesPartitionAppendix).toBe(true);
    expect(body?.result.partitions.length).toBeGreaterThan(0);

    const tailwind = body?.result.exports.find((artifact: { tab: string }) => artifact.tab === "Tailwind v4");
    const designJson = body?.result.exports.find((artifact: { tab: string }) => artifact.tab === "Design JSON");
    const designTokens = body?.result.exports.find((artifact: { tab: string }) => artifact.tab === "Design Tokens");

    expect(tailwind?.content).toContain("--color-primary-ink");
    expect(tailwind?.content).toContain("--font-display");
    expect(tailwind?.content).not.toContain("--color-1");

    expect(JSON.parse(designJson?.content ?? "{}").meta).toEqual({
      confidence: "high",
      evidence: {
        pageCount: 4,
        failureCount: 0
      },
      includesPartitionAppendix: true,
      provenanceWarnings: ["Browser observation skipped: Playwright is unavailable in the runtime environment."]
    });

    expect(JSON.parse(designTokens?.content ?? "{}").meta).toEqual({
      confidence: "high",
      pageCount: 4,
      failureCount: 0,
      includesPartitionAppendix: true
    });
  });

  it("returns evidence-backed extraction fields from completed jobs without changing the route contract", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();

      switch (url) {
        case "https://evidence.test":
          return html(`
            <html>
              <head>
                <title>Evidence OS</title>
                <meta name="theme-color" content="#0E7490" />
                <style>
                  body { font-family: "Inter", system-ui, sans-serif; color: #172033; background: #F8FAFC; }
                  h1 { font-family: "Fraunces", Georgia, serif; }
                </style>
              </head>
              <body>
                <h1>Design operations for fast teams</h1>
                <p>Shared system workflows and approvals.</p>
                <a href="/docs">Docs</a>
                <a href="/workspace">Workspace</a>
              </body>
            </html>
          `);
        case "https://evidence.test/docs":
          return html(`
            <html>
              <head><title>Evidence Docs</title></head>
              <body style="color:#526077;font-family:'Inter',system-ui,sans-serif;">
                <h1>Developer docs</h1>
                <p>Reference material for implementation.</p>
              </body>
            </html>
          `);
        case "https://evidence.test/workspace":
          return html(`
            <html>
              <head><title>Evidence Workspace</title></head>
              <body style="background:#F8FAFC;color:#172033;">
                <h1>Workspace command center</h1>
                <p>Review queues and active work.</p>
              </body>
            </html>
          `);
        default:
          return html("<html><body>missing</body></html>", 404);
      }
    });

    vi.stubGlobal("fetch", fetchMock);

    const createResponse = await createJob(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://evidence.test",
          selectedPresetIds: ["linear"],
          selectedCategoryIds: ["Dark"]
        })
      })
    );
    const created = await createResponse.json();

    let body: Awaited<ReturnType<Response["json"]>> | undefined;

    for (const _stage of JOB_STAGES) {
      const response = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}`), {
        params: { jobId: created.jobId }
      });
      body = await response.json();
      expect(response.status).toBe(200);
    }

    expect(body?.job.status).toBe("completed");
    expect(body?.result.palette.map((token: { value: string }) => token.value)).toEqual(
      expect.arrayContaining(["#0E7490", "#172033", "#F8FAFC"])
    );
    expect(body?.result.typography.find((token: { name: string }) => token.name === "Display")?.family).toContain("Fraunces");
    expect(body?.result.typography.find((token: { name: string }) => token.name === "Body")?.family).toContain("Inter");
    expect(body?.result.componentPreviews.map((preview: { label: string }) => preview.label)).toEqual([
      "Hero framing",
      "Documentation entry",
      "Workspace shell"
    ]);
    expect(body?.result.exports.map((artifact: { tab: string }) => artifact.tab)).toEqual(EXPORT_TABS);
  });

  it("returns a failed snapshot when discovery cannot crawl the submitted url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => html("<html><body>unavailable</body></html>", 500))
    );

    const createResponse = await createJob(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://offline.test",
          selectedPresetIds: ["intercom"],
          selectedCategoryIds: ["SaaS"]
        })
      })
    );
    const created = await createResponse.json();

    const response = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}`), {
      params: { jobId: created.jobId }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.job.status).toBe("failed");
    expect(body.job.currentStage).toBe("Discover");
    expect(body.job.stages.find((stage: { name: string }) => stage.name === "Discover")?.error).toBeTruthy();
    expect(body.result).toBeUndefined();
  });

  it("returns an actionable anti-bot failure message when the submitted site serves a challenge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html><body>challenge</body></html>", {
            status: 403,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cf-mitigated": "challenge",
              server: "cloudflare"
            }
          })
      )
    );

    const createResponse = await createJob(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://blocked.test",
          selectedPresetIds: ["intercom"],
          selectedCategoryIds: ["SaaS"]
        })
      })
    );
    const created = await createResponse.json();

    const response = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}`), {
      params: { jobId: created.jobId }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.job.status).toBe("failed");
    expect(body.job.failureMessage).toContain("anti-bot challenge");
    expect(body.job.failureMessage).toContain("403");
  });

  it("retries a failed discover job when retry=1 is requested", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();

      if (fetchMock.mock.calls.length === 1) {
        return html("<html><body>unavailable</body></html>", 503);
      }

      switch (url) {
        case "https://retry.test":
          return html(`
            <html>
              <head><title>Retry Cloud</title></head>
              <body>
                <h1>Retry Cloud</h1>
                <p>Recovered support workspace.</p>
                <a href="/docs">Docs</a>
              </body>
            </html>
          `);
        case "https://retry.test/docs":
          return html("<html><head><title>Retry Docs</title></head><body><h1>Docs</h1></body></html>");
        default:
          return html("<html><body>missing</body></html>", 404);
      }
    });

    vi.stubGlobal("fetch", fetchMock);

    const createResponse = await createJob(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://retry.test",
          selectedPresetIds: ["intercom"],
          selectedCategoryIds: ["SaaS"]
        })
      })
    );
    const created = await createResponse.json();

    const failedResponse = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}`), {
      params: { jobId: created.jobId }
    });
    const failedBody = await failedResponse.json();

    expect(failedBody.job.status).toBe("failed");

    const retriedResponse = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}?retry=1`), {
      params: { jobId: created.jobId }
    });
    const retriedBody = await retriedResponse.json();

    expect(retriedResponse.status).toBe(200);
    expect(retriedBody.job.status).toBe("running");
    expect(retriedBody.job.currentStage).toBe("Partition");
    expect(retriedBody.job.retryCount).toBe(1);
    expect(retriedBody.job.failureMessage).toBeUndefined();
    expect(retriedBody.job.stages.find((stage: { name: string }) => stage.name === "Discover")?.status).toBe("completed");
  });

  it("resumes partial crawl coverage on a completed job when retry=1 is requested", async () => {
    let docsRecovered = false;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();

      switch (url) {
        case "https://resume.test":
          return html(`
            <html>
              <head><title>Resume Cloud</title></head>
              <body>
                <h1>Resume Cloud</h1>
                <p>Support tooling.</p>
                <a href="/docs">Docs</a>
              </body>
            </html>
          `);
        case "https://resume.test/docs":
          if (!docsRecovered) {
            return html("<html><body>unavailable</body></html>", 500);
          }

          return html("<html><head><title>Resume Docs</title></head><body><h1>Documentation</h1></body></html>");
        default:
          return html("<html><body>missing</body></html>", 404);
      }
    });

    vi.stubGlobal("fetch", fetchMock);

    const createResponse = await createJob(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://resume.test",
          selectedPresetIds: ["intercom"],
          selectedCategoryIds: ["SaaS"]
        })
      })
    );
    const created = await createResponse.json();

    let body: Awaited<ReturnType<Response["json"]>> | undefined;

    for (const _stage of JOB_STAGES) {
      const response = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}`), {
        params: { jobId: created.jobId }
      });
      body = await response.json();
      expect(response.status).toBe(200);
    }

    expect(body?.job.status).toBe("completed");
    expect(body?.job.evidence.failures).toHaveLength(1);
    expect(body?.result.riskLabels).toEqual(
      expect.arrayContaining([{ label: "Partial crawl coverage", scope: "Same-origin fetch coverage" }])
    );

    docsRecovered = true;

    const resumeResponse = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}?retry=1`), {
      params: { jobId: created.jobId }
    });
    const resumed = await resumeResponse.json();

    expect(resumeResponse.status).toBe(200);
    expect(resumed.job.status).toBe("running");
    expect(resumed.job.currentStage).toBe("Partition");
    expect(resumed.job.retryCount).toBe(1);
    expect(resumed.job.evidence.pages.map((page: { url: string }) => page.url)).toEqual([
      "https://resume.test",
      "https://resume.test/docs"
    ]);
    expect(resumed.job.evidence.failures).toHaveLength(0);

    for (let index = 0; index < JOB_STAGES.length - 1; index += 1) {
      const response = await getJob(new Request(`http://localhost/api/jobs/${created.jobId}`), {
        params: { jobId: created.jobId }
      });
      body = await response.json();
      expect(response.status).toBe(200);
    }

    expect(body?.job.status).toBe("completed");
    expect(body?.job.evidence.failures).toHaveLength(0);
    expect(body?.result.riskLabels).toEqual([]);
  });

  it("retries a failed validate job by regenerating the result before validating again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        html(`
          <html>
            <head><title>Validate Retry</title></head>
            <body>
              <h1>Validate Retry</h1>
              <p>Retry path</p>
            </body>
          </html>
        `)
      )
    );

    const repository = createFileJobRepository(process.env.DBOT_RUNTIME_FILE!);
    const job = createJobRecord(
      {
        url: "https://validate-retry.test",
        selectedPresetIds: ["intercom"],
        selectedCategoryIds: ["SaaS"]
      },
      "2026-04-09T15:00:00.000Z"
    );

    job.status = "failed";
    job.currentStage = "Validate";
    job.failureStage = "Validate";
    job.failureMessage = "Validate failed: generated result missing";
    job.evidence = {
      pages: [
        {
          url: "https://validate-retry.test",
          title: "Validate Retry",
          headings: ["Validate Retry"],
          description: "Retry path",
          textSnippets: ["Retry path"]
        }
      ],
      failures: []
    };
    job.extracted = {
      siteTitle: "Validate Retry",
      vibe: "SaaS product voice with low evidence coverage.",
      narrative: "Narrative",
      tags: ["saas"],
      confidence: "low",
      partitions: [],
      riskLabels: []
    };
    job.result = undefined;
    job.stages = job.stages.map((stage) => {
      if (stage.name === "Generate") {
        return {
          ...stage,
          status: "completed",
          startedAt: "2026-04-09T15:03:00.000Z",
          endedAt: "2026-04-09T15:03:30.000Z",
          message: "Completed",
          error: null
        };
      }

      if (stage.name === "Validate") {
        return {
          ...stage,
          status: "failed",
          startedAt: "2026-04-09T15:04:00.000Z",
          endedAt: "2026-04-09T15:04:05.000Z",
          message: null,
          error: "Validate failed: generated result missing"
        };
      }

      return {
        ...stage,
        status: "completed",
        startedAt: "2026-04-09T15:02:00.000Z",
        endedAt: "2026-04-09T15:02:30.000Z",
        message: "Completed",
        error: null
      };
    });

    await repository.save(job);

    const retryResponse = await getJob(new Request(`http://localhost/api/jobs/${job.id}?retry=1`), {
      params: { jobId: job.id }
    });
    const retried = await retryResponse.json();

    expect(retryResponse.status).toBe(200);
    expect(retried.job.status).toBe("running");
    expect(retried.job.currentStage).toBe("Partition");
    expect(retried.job.retryCount).toBe(1);
    expect(retried.job.stages.find((stage: { name: string }) => stage.name === "Discover")?.status).toBe("completed");
    expect(retried.job.stages.find((stage: { name: string }) => stage.name === "Generate")?.status).toBe("pending");
    expect(retried.result).toBeUndefined();

    let completedResponse: Response | undefined;
    let completed: Awaited<ReturnType<Response["json"]>> | undefined;

    for (let index = 0; index < JOB_STAGES.length - 1; index += 1) {
      completedResponse = await getJob(new Request(`http://localhost/api/jobs/${job.id}`), {
        params: { jobId: job.id }
      });
      completed = await completedResponse.json();
    }

    expect(completedResponse?.status).toBe(200);
    expect(completed?.job.status).toBe("completed");
    expect(completed?.job.failureMessage).toBeUndefined();
    expect(completed?.result?.exports.map((artifact: { tab: string }) => artifact.tab)).toEqual(EXPORT_TABS);
  });
});
