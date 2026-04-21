import "@testing-library/jest-dom/vitest";

const canvasContextStub = {
  scale: () => undefined,
  clearRect: () => undefined,
  beginPath: () => undefined,
  arc: () => undefined,
  fill: () => undefined,
  fillStyle: ""
};

if (typeof HTMLCanvasElement !== "undefined" && !HTMLCanvasElement.prototype.getContext) {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => canvasContextStub
  });
}
