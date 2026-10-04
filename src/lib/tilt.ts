/**
 * How far the home page stepwell tilts toward the pointer (DESIGN.md
 * "Stepwell scene"): the pointer's offset from the box's center, scaled to at
 * most `max` degrees each way and clamped when the pointer is outside the box.
 * x turns the scene left and right, y tips it toward or away from the viewer.
 */
export function tiltFromPointer(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
  max = 6,
): { x: number; y: number } {
  const clamp = (n: number) => Math.min(1, Math.max(-1, n));
  const nx = clamp(((clientX - box.left) / box.width) * 2 - 1);
  const ny = clamp(((clientY - box.top) / box.height) * 2 - 1);
  // "+ 0" turns -0 into 0, so the CSS value is never "-0deg".
  return { x: Math.round(nx * max * 10) / 10 + 0, y: Math.round(-ny * max * 10) / 10 + 0 };
}
