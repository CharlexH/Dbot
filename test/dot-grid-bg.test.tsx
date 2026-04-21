import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DotGridBg } from "@/components/home/dot-grid-bg";

describe("dot grid background", () => {
  let context: {
    scale: ReturnType<typeof vi.fn>;
    clearRect: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    arc: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    fillStyle: string;
  };

  let getContextSpy: { mockRestore: () => void };
  let rafCallback: FrameRequestCallback | null;

  beforeEach(() => {
    context = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: ""
    };
    rafCallback = null;

    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);

    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("pins the canvas to the viewport and increases nearby dot size on hover", () => {
    const { container } = render(<DotGridBg />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toBeTruthy();
    if (!canvas) {
      throw new Error("Canvas element was not rendered.");
    }
    expect(canvas).toHaveClass("fixed");
    expect(canvas).toHaveClass("inset-0");

    Object.defineProperty(canvas, "clientWidth", {
      configurable: true,
      value: 88
    });
    Object.defineProperty(canvas, "clientHeight", {
      configurable: true,
      value: 88
    });
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 1
    });

    canvas.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 88,
        height: 88,
        top: 0,
        right: 88,
        bottom: 88,
        left: 0,
        toJSON: () => ({})
      }) as DOMRect;

    act(() => {
      rafCallback?.(0);
    });

    const baseRadii = context.arc.mock.calls.map((call) => call[2] as number);
    context.arc.mockClear();

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 22, clientY: 22 }));
    });

    act(() => {
      rafCallback?.(16);
    });

    const hoverRadii = context.arc.mock.calls.map((call) => call[2] as number);

    expect(Math.max(...hoverRadii)).toBeGreaterThan(Math.max(...baseRadii));
  });
});
