"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { tiltFromPointer } from "@/lib/tilt";

/**
 * Tilts the stepwell toward a mouse pointer (DESIGN.md "Stepwell scene").
 * The angles go into CSS variables through style.setProperty, which the CSP
 * allows (it blocks server-rendered style attributes, not the CSSOM). Not
 * attached under "reduce motion", and touch is skipped: a tap selects a step.
 */
export function StepwellTilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const set = (x: number, y: number) => {
      el.style.setProperty("--tilt-x", `${x}deg`);
      el.style.setProperty("--tilt-y", `${y}deg`);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { x, y } = tiltFromPointer(e.clientX, e.clientY, el.getBoundingClientRect());
        set(x, y);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      set(0, 0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
