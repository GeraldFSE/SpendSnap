import { polarToCartesian, arcPath, computeSlices } from "../pieMath";

describe("polarToCartesian", () => {
  it("places 0 degrees at the top of the circle", () => {
    const point = polarToCartesian(0, 0, 10, 0);
    expect(point.x).toBeCloseTo(0, 6);
    expect(point.y).toBeCloseTo(-10, 6);
  });

  it("places 90 degrees at the right", () => {
    const point = polarToCartesian(0, 0, 10, 90);
    expect(point.x).toBeCloseTo(10, 6);
    expect(point.y).toBeCloseTo(0, 6);
  });

  it("respects the center offset", () => {
    const point = polarToCartesian(50, 50, 10, 180);
    expect(point.x).toBeCloseTo(50, 6);
    expect(point.y).toBeCloseTo(60, 6);
  });
});

describe("arcPath", () => {
  it("starts with a move to the center and closes the path", () => {
    const path = arcPath(50, 50, 40, 0, 90);
    expect(path.startsWith("M 50 50")).toBe(true);
    expect(path.trim().endsWith("Z")).toBe(true);
  });

  it("uses the small-arc flag for sweeps <= 180 degrees", () => {
    expect(arcPath(50, 50, 40, 0, 90)).toContain("A 40 40 0 0 0");
  });

  it("uses the large-arc flag for sweeps > 180 degrees", () => {
    expect(arcPath(50, 50, 40, 0, 270)).toContain("A 40 40 0 1 0");
  });
});

describe("computeSlices", () => {
  it("computes cumulative angles proportional to value", () => {
    const { total, slices } = computeSlices([
      { key: "a", value: 30 },
      { key: "b", value: 10 }
    ]);

    expect(total).toBe(40);
    expect(slices).toHaveLength(2);
    expect(slices[0]).toMatchObject({ key: "a", startAngle: 0, endAngle: 270, sweep: 270 });
    expect(slices[1]).toMatchObject({ key: "b", startAngle: 270, endAngle: 360, sweep: 90 });
  });

  it("drops zero and negative values from the drawn slices", () => {
    const { slices } = computeSlices([
      { key: "a", value: 10 },
      { key: "b", value: 0 },
      { key: "c", value: -5 }
    ]);
    expect(slices.map((slice) => slice.key)).toEqual(["a"]);
  });

  it("returns no slices for empty or all-zero data", () => {
    expect(computeSlices([]).slices).toEqual([]);
    expect(computeSlices([{ key: "a", value: 0 }]).total).toBe(0);
    expect(computeSlices([{ key: "a", value: 0 }]).slices).toEqual([]);
  });
});
