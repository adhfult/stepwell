import { describe, expect, it } from "vitest";
import { tiltFromPointer } from "./tilt";

const box = { left: 100, top: 50, width: 200, height: 100 };

describe("tiltFromPointer", () => {
  it("is flat at the center", () => {
    expect(tiltFromPointer(200, 100, box)).toEqual({ x: 0, y: 0 });
  });

  it("reaches the maximum at the corners", () => {
    expect(tiltFromPointer(100, 50, box)).toEqual({ x: -6, y: 6 });
    expect(tiltFromPointer(300, 150, box)).toEqual({ x: 6, y: -6 });
  });

  it("clamps when the pointer is outside the box", () => {
    expect(tiltFromPointer(-500, 900, box, 4)).toEqual({ x: -4, y: -4 });
  });
});
