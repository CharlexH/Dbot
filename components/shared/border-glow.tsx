"use client";

import { CSSProperties, HTMLAttributes, PointerEvent, ReactNode, useCallback, useEffect, useRef } from "react";
import styles from "./border-glow.module.css";

interface BorderGlowProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  innerClassName?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function parseHsl(hslValue: string) {
  const match = hslValue.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);

  if (!match) {
    return { h: 223, s: 78, l: 58 };
  }

  return {
    h: Number.parseFloat(match[1]),
    s: Number.parseFloat(match[2]),
    l: Number.parseFloat(match[3]),
  };
}

function buildGlowVars(glowColor: string, intensity: number) {
  const { h, s, l } = parseHsl(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const stops = [100, 60, 50, 40, 30, 20];
  const suffixes = ["", "-60", "-50", "-40", "-30", "-20"];

  return stops.reduce<Record<string, string>>((accumulator, opacity, index) => {
    accumulator[`--glow-color${suffixes[index]}`] = `hsl(${base} / ${Math.min(opacity * intensity, 100)}%)`;
    return accumulator;
  }, {});
}

const gradientPositions = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
const gradientKeys = ["--gradient-one", "--gradient-two", "--gradient-three", "--gradient-four", "--gradient-five", "--gradient-six", "--gradient-seven"];
const colorMap = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors: string[]) {
  return gradientKeys.reduce<Record<string, string>>((accumulator, key, index) => {
    const color = colors[Math.min(colorMap[index], colors.length - 1)];
    accumulator[key] = `radial-gradient(at ${gradientPositions[index]}, ${color} 0px, transparent 52%)`;
    return accumulator;
  }, {
    "--gradient-base": `linear-gradient(${colors[0]} 0 100%)`,
  });
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInCubic(value: number) {
  return value * value * value;
}

function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: {
  start?: number;
  end?: number;
  duration?: number;
  delay?: number;
  ease?: (value: number) => number;
  onUpdate: (value: number) => void;
  onEnd?: () => void;
}) {
  const startAt = performance.now() + delay;

  function tick() {
    const elapsed = performance.now() - startAt;
    const progress = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(progress));

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    onEnd?.();
  }

  window.setTimeout(() => requestAnimationFrame(tick), delay);
}

export function BorderGlow({
  children,
  className,
  innerClassName,
  edgeSensitivity = 24,
  glowColor = "223 78 58",
  backgroundColor = "#ffffff",
  borderColor = "rgba(215, 224, 235, 0.78)",
  borderRadius = 16,
  glowRadius = 28,
  glowIntensity = 0.95,
  coneSpread = 22,
  animated = false,
  colors = ["#315ee7", "#86a6ff", "#d7e0eb"],
  fillOpacity = 0.3,
  onPointerMove,
  onPointerLeave,
  style,
  ...rest
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const getCenterOfElement = useCallback((element: HTMLElement) => {
    const { width, height } = element.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getEdgeProximity = useCallback((element: HTMLElement, x: number, y: number) => {
    const [centerX, centerY] = getCenterOfElement(element);
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    const scaleX = deltaX === 0 ? Number.POSITIVE_INFINITY : centerX / Math.abs(deltaX);
    const scaleY = deltaY === 0 ? Number.POSITIVE_INFINITY : centerY / Math.abs(deltaY);

    return Math.min(Math.max(1 / Math.min(scaleX, scaleY), 0), 1);
  }, [getCenterOfElement]);

  const getCursorAngle = useCallback((element: HTMLElement, x: number, y: number) => {
    const [centerX, centerY] = getCenterOfElement(element);
    const deltaX = x - centerX;
    const deltaY = y - centerY;

    if (deltaX === 0 && deltaY === 0) {
      return 0;
    }

    const radians = Math.atan2(deltaY, deltaX);
    let degrees = radians * (180 / Math.PI) + 90;

    if (degrees < 0) {
      degrees += 360;
    }

    return degrees;
  }, [getCenterOfElement]);

  useEffect(() => {
    if (!animated || !cardRef.current) {
      return;
    }

    const card = cardRef.current;
    const angleStart = 110;
    const angleEnd = 465;

    card.classList.add(styles.sweepActive);
    card.style.setProperty("--cursor-angle", `${angleStart}deg`);

    animateValue({
      duration: 450,
      onUpdate: (value) => card.style.setProperty("--edge-proximity", value.toFixed(3)),
    });

    animateValue({
      ease: easeInCubic,
      duration: 1200,
      end: 50,
      onUpdate: (value) => {
        const angle = (angleEnd - angleStart) * (value / 100) + angleStart;
        card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
      },
    });

    animateValue({
      ease: easeOutCubic,
      delay: 1200,
      duration: 1600,
      start: 50,
      end: 100,
      onUpdate: (value) => {
        const angle = (angleEnd - angleStart) * (value / 100) + angleStart;
        card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
      },
    });

    animateValue({
      ease: easeInCubic,
      delay: 2050,
      duration: 1100,
      start: 100,
      end: 0,
      onUpdate: (value) => card.style.setProperty("--edge-proximity", value.toFixed(3)),
      onEnd: () => card.classList.remove(styles.sweepActive),
    });
  }, [animated]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;

    if (!card) {
      onPointerMove?.(event);
      return;
    }

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edge = getEdgeProximity(card, x, y);
    const angle = getCursorAngle(card, x, y);

    card.style.setProperty("--edge-proximity", `${(edge * 100).toFixed(3)}`);
    card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
    onPointerMove?.(event);
  }, [getCursorAngle, getEdgeProximity, onPointerMove]);

  const handlePointerLeave = useCallback((event: PointerEvent<HTMLDivElement>) => {
    cardRef.current?.style.setProperty("--edge-proximity", "0");
    onPointerLeave?.(event);
  }, [onPointerLeave]);

  const styleVars = {
    "--card-bg": backgroundColor,
    "--edge-sensitivity": edgeSensitivity,
    "--border-radius": `${borderRadius}px`,
    "--glow-padding": `${glowRadius}px`,
    "--cone-spread": coneSpread,
    "--fill-opacity": fillOpacity,
    "--surface-border": borderColor,
    ...buildGlowVars(glowColor, glowIntensity),
    ...buildGradientVars(colors),
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={cardRef}
      className={joinClasses(styles.card, className)}
      style={styleVars}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...rest}
    >
      <span className={styles.edgeLight} />
      <div className={joinClasses(styles.inner, innerClassName)}>
        {children}
      </div>
    </div>
  );
}
