import { formatCurrency, formatCompactCurrency } from "../currency";

describe("formatCurrency", () => {
  it("formats numbers as SGD with two decimals", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("coerces numeric strings", () => {
    expect(formatCurrency("42")).toBe("$42.00");
  });

  it("falls back to $0.00 for non-numeric / nullish input", () => {
    expect(formatCurrency(undefined)).toBe("$0.00");
    expect(formatCurrency(null)).toBe("$0.00");
    expect(formatCurrency("abc")).toBe("$0.00");
    expect(formatCurrency(NaN)).toBe("$0.00");
  });

  it("rounds to the nearest cent", () => {
    expect(formatCurrency(1.239)).toBe("$1.24");
    expect(formatCurrency(2.994)).toBe("$2.99");
  });

  it("handles negative amounts", () => {
    expect(formatCurrency(-5)).toBe("-$5.00");
  });
});

describe("formatCompactCurrency", () => {
  it("returns $0 for zero", () => {
    expect(formatCompactCurrency(0)).toBe("$0");
  });

  it("returns $0 for nullish/NaN", () => {
    expect(formatCompactCurrency(undefined)).toBe("$0");
    expect(formatCompactCurrency(NaN)).toBe("$0");
  });

  it("compacts thousands", () => {
    // en-SG compact notation renders 12,000 as "$12.0K".
    expect(formatCompactCurrency(12000)).toMatch(/12(\.\d)?K/);
  });

  it("keeps small amounts readable", () => {
    expect(formatCompactCurrency(42)).toMatch(/42/);
  });
});
