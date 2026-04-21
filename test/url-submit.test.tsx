import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";
import { UrlInputForm } from "@/components/home/url-input-form";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_DBOT_HAS_SERVER_GEMINI_KEY;
  vi.unstubAllGlobals();
});

describe("url submit flow", () => {
  it("posts a generate request and returns the created job payload to the parent controller", async () => {
    const user = userEvent.setup();
    const onJobCreated = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: "job_123",
        route: "/results/job_123",
        snapshot: {
          job: {
            id: "job_123",
            status: "queued",
            currentStage: "Discover"
          }
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<UrlInputForm selectedPresetId="revolut" selectedCategory="Fintech" onJobCreated={onJobCreated} />);
    await user.clear(screen.getByLabelText(/website url/i));
    await user.type(screen.getByLabelText(/website url/i), "https://revolut.com");
    await user.click(screen.getByRole("button", { name: /extract/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/jobs",
        expect.objectContaining({
          method: "POST"
        })
      );
      expect(onJobCreated).toHaveBeenCalledWith({
        jobId: "job_123",
        route: "/results/job_123",
        snapshot: {
          job: {
            id: "job_123",
            status: "queued",
            currentStage: "Discover"
          }
        }
      });
    });
  }, 10000);

  it("keeps the Gemini key editable and masked even when a server-side key is available", async () => {
    process.env.NEXT_PUBLIC_DBOT_HAS_SERVER_GEMINI_KEY = "1";

    const user = userEvent.setup();
    const onJobCreated = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: "job_456",
        route: "/results/job_456",
        snapshot: {
          job: {
            id: "job_456",
            status: "queued",
            currentStage: "Discover"
          }
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<UrlInputForm selectedPresetId="revolut" selectedCategory="Fintech" onJobCreated={onJobCreated} />);
    const keyInput = screen.getByLabelText(/gemini api key/i);

    expect(keyInput).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: /google ai studio/i })).toHaveAttribute(
      "href",
      "https://aistudio.google.com/app/apikey"
    );
    expect(screen.queryByText(/override it for this run/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/website url/i), "https://revolut.com");
    await user.type(keyInput, "manual-key");
    await user.click(screen.getByRole("button", { name: /extract/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse(requestInit.body as string);

    expect(payload.geminiApiKey).toBe("manual-key");
    expect(payload.geminiModel).toBe("gemini-3.1-flash-lite-preview");
    expect(onJobCreated).toHaveBeenCalledTimes(1);
  });

  it("points users to Google AI Studio when no Gemini key is available", () => {
    render(<UrlInputForm selectedPresetId="revolut" selectedCategory="Fintech" />);

    expect(screen.getByText(/no gemini api key yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /google ai studio/i })).toHaveAttribute(
      "href",
      "https://aistudio.google.com/app/apikey"
    );
  });
});
