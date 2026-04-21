import { BrowserObservedPage, PageRole } from "@/types";

const MAX_TYPOGRAPHY_SAMPLES = 12;
const MAX_SURFACE_SAMPLES = 18;
const MAX_CSS_VARIABLES = 64;
const MAX_ICON_SAMPLES = 12;

export interface RepresentativeObservationTarget {
  url: string;
  title: string;
  pageRole: PageRole;
}

export interface BrowserObservationResult {
  pages: BrowserObservedPage[];
  warnings: string[];
}

type PlaywrightModule = {
  chromium?: {
    launch: (options?: Record<string, unknown>) => Promise<{
      newPage: (options?: Record<string, unknown>) => Promise<{
        goto: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
        waitForLoadState: (state: string, options?: Record<string, unknown>) => Promise<void>;
        title: () => Promise<string>;
        url: () => string;
        evaluate: <T, A = unknown>(fn: (arg: A) => T, arg?: A) => Promise<T>;
        close: () => Promise<void>;
      }>;
      close: () => Promise<void>;
    }>;
  };
};

function getModuleLoader(): (moduleName: string) => Promise<unknown> {
  return new Function("moduleName", "return import(moduleName);") as (moduleName: string) => Promise<unknown>;
}

async function loadPlaywrightModule(): Promise<PlaywrightModule | null> {
  const dynamicImport = getModuleLoader();

  for (const moduleName of ["playwright", "playwright-core"]) {
    try {
      return (await dynamicImport(moduleName)) as PlaywrightModule;
    } catch {
      continue;
    }
  }

  return null;
}

export async function observeRepresentativePages(
  targets: RepresentativeObservationTarget[]
): Promise<BrowserObservationResult> {
  if (targets.length === 0) {
    return { pages: [], warnings: [] };
  }

  const playwright = await loadPlaywrightModule();
  if (!playwright?.chromium) {
    return {
      pages: [],
      warnings: ["Browser observation skipped: Playwright is unavailable in the runtime environment."]
    };
  }

  let browser:
    | Awaited<ReturnType<NonNullable<PlaywrightModule["chromium"]>["launch"]>>
    | undefined;
  const warnings: string[] = [];
  const pages: BrowserObservedPage[] = [];

  try {
    browser = await playwright.chromium.launch({
      headless: true
    });

    for (const target of targets) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1024 }
      });

      try {
        await page.goto(target.url, {
          waitUntil: "domcontentloaded",
          timeout: 15000
        });

        try {
          await page.waitForLoadState("networkidle", { timeout: 5000 });
        } catch {
          /* ignore long-polling and interactive apps */
        }

        const payload = await page.evaluate(
          ({ maxCssVariables, maxTypographySamples, maxSurfaceSamples, maxIconSamples: iconSampleLimit }) => {
          function normalizeWhitespace(value: string): string {
            return value.replace(/\s+/g, " ").trim();
          }

          function isVisible(element: Element): element is HTMLElement {
            if (!(element instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number.parseFloat(style.opacity || "1") > 0 &&
              rect.width > 0 &&
              rect.height > 0
            );
          }

          function buildSelector(element: Element): string {
            if (element instanceof HTMLElement && element.id) {
              return `#${element.id}`;
            }

            const className =
              element instanceof HTMLElement
                ? element.className
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((token) => `.${token}`)
                    .join("")
                : "";

            const base = `${element.tagName.toLowerCase()}${className}`;
            const parent = element.parentElement;

            if (!parent) {
              return base;
            }

            const siblings = Array.from(parent.children).filter(
              (candidate) => candidate.tagName === element.tagName
            );
            const index = siblings.indexOf(element) + 1;

            return `${parent.tagName.toLowerCase()} > ${base}:nth-of-type(${index})`;
          }

          function buildExcerpt(element: HTMLElement): string {
            const text =
              normalizeWhitespace(element.innerText || "") ||
              normalizeWhitespace(element.getAttribute("aria-label") || "") ||
              normalizeWhitespace(element.getAttribute("placeholder") || "");

            return text.slice(0, 96);
          }

          const rootStyle = window.getComputedStyle(document.documentElement);
          const cssVariables: Record<string, string> = {};

          for (const propertyName of Array.from(rootStyle)) {
            if (!propertyName.startsWith("--")) continue;
            const value = normalizeWhitespace(rootStyle.getPropertyValue(propertyName));
            if (!value) continue;
            cssVariables[propertyName] = value;
            if (Object.keys(cssVariables).length >= maxCssVariables) break;
          }

          const typography: Array<{
            role: "heading" | "body" | "label" | "button";
            selector: string;
            excerpt: string;
            family?: string;
            size?: string;
            weight?: string;
            lineHeight?: string;
            letterSpacing?: string;
            color?: string;
          }> = [];
          const typographyCandidates = Array.from(
            document.querySelectorAll("h1, h2, h3, p, button, label, a, span")
          );

          for (const candidate of typographyCandidates) {
            if (!isVisible(candidate)) continue;
            const excerpt = buildExcerpt(candidate);
            if (!excerpt) continue;
            const computed = window.getComputedStyle(candidate);
            const tagName = candidate.tagName.toLowerCase();
            const role =
              tagName === "button"
                ? "button"
                : tagName === "label"
                  ? "label"
                  : tagName.startsWith("h")
                    ? "heading"
                    : "body";

            typography.push({
              role,
              selector: buildSelector(candidate),
              excerpt,
              family: normalizeWhitespace(computed.fontFamily),
              size: normalizeWhitespace(computed.fontSize),
              weight: normalizeWhitespace(computed.fontWeight),
              lineHeight: normalizeWhitespace(computed.lineHeight),
              letterSpacing: normalizeWhitespace(computed.letterSpacing),
              color: normalizeWhitespace(computed.color)
            });

            if (typography.length >= maxTypographySamples) break;
          }

          const surfaces: Array<{
            kind: "button" | "card" | "input";
            selector: string;
            excerpt: string;
            backgroundColor?: string;
            color?: string;
            borderColor?: string;
            borderRadius?: string;
            boxShadow?: string;
            padding?: string;
          }> = [];
          const surfaceCandidates = Array.from(
            document.querySelectorAll("button, [role='button'], input, textarea, select, article, section, div")
          );

          for (const candidate of surfaceCandidates) {
            if (!isVisible(candidate)) continue;
            const computed = window.getComputedStyle(candidate);
            const excerpt = buildExcerpt(candidate);
            const backgroundColor = normalizeWhitespace(computed.backgroundColor);
            const borderRadius = normalizeWhitespace(computed.borderRadius);
            const boxShadow = normalizeWhitespace(computed.boxShadow);
            const borderColor = normalizeWhitespace(computed.borderColor);
            const padding = [computed.paddingTop, computed.paddingRight, computed.paddingBottom, computed.paddingLeft]
              .map((value) => normalizeWhitespace(value))
              .join(" ")
              .trim();

            const hasSignal =
              backgroundColor !== "rgba(0, 0, 0, 0)" ||
              borderRadius !== "0px" ||
              boxShadow !== "none" ||
              padding !== "0px 0px 0px 0px";

            if (!hasSignal) continue;

            const tagName = candidate.tagName.toLowerCase();
            const kind =
              tagName === "button" || candidate.getAttribute("role") === "button"
                ? "button"
                : ["input", "textarea", "select"].includes(tagName)
                  ? "input"
                  : "card";

            surfaces.push({
              kind,
              selector: buildSelector(candidate),
              excerpt,
              backgroundColor,
              color: normalizeWhitespace(computed.color),
              borderColor,
              borderRadius,
              boxShadow,
              padding
            });

            if (surfaces.length >= maxSurfaceSamples) break;
          }

          const icons: Array<{
            label: string;
            selector: string;
            svg: string;
            source: "crawl-browser";
            width: number;
            height: number;
          }> = [];
          const seenIcons = new Set<string>();
          const iconCandidates = Array.from(document.querySelectorAll("svg"));

          for (const candidate of iconCandidates) {
            if (!isVisible(candidate)) continue;
            const rect = candidate.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0 || rect.width > 48 || rect.height > 48) continue;
            if (candidate.querySelector("text, foreignObject, image, video")) continue;

            const svg = normalizeWhitespace(candidate.outerHTML);
            if (!svg || seenIcons.has(svg)) continue;

            const labelSource =
              normalizeWhitespace(candidate.getAttribute("aria-label") || "") ||
              normalizeWhitespace(candidate.closest("button, a, [role='button']")?.getAttribute("aria-label") || "") ||
              normalizeWhitespace(candidate.closest("button, a, [role='button']")?.textContent || "");

            seenIcons.add(svg);
            icons.push({
              label: labelSource.slice(0, 48) || `Icon ${icons.length + 1}`,
              selector: buildSelector(candidate),
              svg,
              source: "crawl-browser",
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });

            if (icons.length >= iconSampleLimit) break;
          }

          return {
            cssVariables,
            typography,
            surfaces,
            icons
          };
        },
          {
            maxCssVariables: MAX_CSS_VARIABLES,
            maxTypographySamples: MAX_TYPOGRAPHY_SAMPLES,
            maxSurfaceSamples: MAX_SURFACE_SAMPLES,
            maxIconSamples: MAX_ICON_SAMPLES
          }
        );

        pages.push({
          url: target.url,
          finalUrl: page.url(),
          pageRole: target.pageRole,
          title: (await page.title()) || target.title,
          cssVariables: payload.cssVariables,
          typography: payload.typography,
          surfaces: payload.surfaces,
          icons: payload.icons
        });
      } catch (error) {
        warnings.push(
          `Browser observation skipped for ${target.url}: ${
            error instanceof Error ? error.message : "Unknown browser error."
          }`
        );
      } finally {
        await page.close();
      }
    }
  } catch (error) {
    warnings.push(
      `Browser observation unavailable: ${error instanceof Error ? error.message : "Unable to launch a browser."}`
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return { pages, warnings };
}
