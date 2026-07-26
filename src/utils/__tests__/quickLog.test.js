import { formatLocalDate, normalizeQuickLogResult, parseLocalDate } from "../quickLog";

describe("Quick Log helpers", () => {
  it("formats a local date without shifting time zones", () => {
    expect(formatLocalDate(new Date(2026, 6, 27, 23, 30))).toBe("2026-07-27");
  });

  it("parses valid dates and rejects impossible dates", () => {
    expect(parseLocalDate("2026-07-27")).toBeInstanceOf(Date);
    expect(parseLocalDate("2026-02-30")).toBeNull();
    expect(parseLocalDate("27/07/2026")).toBeNull();
  });

  it("keeps only supported, confident parser fields", () => {
    expect(
      normalizeQuickLogResult({
        merchant: "  McDonald's ",
        amount: "12.80",
        category: "Food",
        type: "expense",
        date: "2026-07-27"
      })
    ).toEqual({
      merchant: "McDonald's",
      amount: 12.8,
      category: "Food",
      type: "expense",
      date: "2026-07-27",
      message: ""
    });
  });

  it("turns ambiguous values into editable blanks", () => {
    expect(
      normalizeQuickLogResult({
        merchant: "",
        amount: -5,
        category: "Entertainment",
        type: "maybe",
        date: "tomorrow"
      })
    ).toEqual({
      merchant: null,
      amount: null,
      category: null,
      type: null,
      date: null,
      message: ""
    });
  });
});
