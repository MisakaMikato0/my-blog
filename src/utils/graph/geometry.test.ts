import { describe, expect, it } from "vitest";
import { clamp, easeOutBack, easeOutCubic } from "@/utils/graph/geometry";

describe("graph geometry", () => {
  it("clamps values to inclusive bounds", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("keeps easing endpoints stable", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutBack(0)).toBe(0);
    expect(easeOutBack(1)).toBe(1);
  });
});