import {
  PERIODS,
  buildRanges,
  sumExpensesInRange,
  summarizeByCategory,
  summarizeCurrentMonth,
  summarizeExpenses
} from "../expenses";
import { dayKey, startOfDay } from "../dates";

const NOW = new Date("2026-06-24T12:00:00"); // a Wednesday

const expenses = [
  { amount: 10, category: "Food", date: new Date("2026-06-24T09:00:00") }, // today
  { amount: 20, category: "Transport", date: new Date("2026-06-23T09:00:00") }, // yesterday
  { amount: 100, category: "Food", date: new Date("2026-06-10T09:00:00") }, // earlier this month, outside 7-day window
  { amount: 5, category: "Shopping", date: new Date("2026-05-30T09:00:00") } // last month
];

describe("sumExpensesInRange", () => {
  it("sums only expenses within [start, end)", () => {
    const start = startOfDay(new Date("2026-06-23T00:00:00"));
    const end = startOfDay(new Date("2026-06-25T00:00:00"));
    expect(sumExpensesInRange(expenses, start, end)).toBe(30); // today + yesterday
  });

  it("excludes the end boundary", () => {
    const start = startOfDay(new Date("2026-06-24T00:00:00"));
    const end = startOfDay(new Date("2026-06-24T00:00:00"));
    expect(sumExpensesInRange(expenses, start, end)).toBe(0);
  });

  it("ignores entries with invalid dates or amounts", () => {
    const dirty = [
      { amount: 10, date: new Date("2026-06-24T00:00:00") },
      { amount: "bad", date: new Date("2026-06-24T00:00:00") },
      { amount: 10, date: null }
    ];
    const start = startOfDay(new Date("2026-06-24T00:00:00"));
    const end = startOfDay(new Date("2026-06-25T00:00:00"));
    expect(sumExpensesInRange(dirty, start, end)).toBe(10);
  });
});

describe("summarizeCurrentMonth", () => {
  it("totals only the current calendar month", () => {
    expect(summarizeCurrentMonth(expenses, NOW)).toBe(130); // 10 + 20 + 100, excludes May 5
  });

  it("returns 0 when nothing falls in the month", () => {
    expect(summarizeCurrentMonth([{ amount: 5, date: new Date("2026-05-30") }], NOW)).toBe(0);
  });
});

describe("summarizeByCategory", () => {
  it("aggregates amounts per category with shares, sorted desc", () => {
    const result = summarizeByCategory(expenses);
    expect(result).toEqual([
      { category: "Food", amount: 110, percent: 110 / 135 },
      { category: "Transport", amount: 20, percent: 20 / 135 },
      { category: "Shopping", amount: 5, percent: 5 / 135 }
    ]);
  });

  it("defaults a missing category to Others", () => {
    const result = summarizeByCategory([{ amount: 7, date: NOW }]);
    expect(result[0].category).toBe("Others");
    expect(result[0].percent).toBe(1);
  });

  it("returns an empty array for no expenses", () => {
    expect(summarizeByCategory([])).toEqual([]);
  });
});

describe("buildRanges", () => {
  it("produces one bucket per configured period count", () => {
    PERIODS.forEach((period) => {
      expect(buildRanges(period.key, NOW)).toHaveLength(period.count);
    });
  });

  it("ends on the current period and starts empty", () => {
    const ranges = buildRanges("daily", NOW);
    expect(ranges).toHaveLength(7);
    expect(ranges[ranges.length - 1].key).toBe(dayKey(NOW));
    expect(ranges.every((range) => range.total === 0)).toBe(true);
  });
});

describe("summarizeExpenses", () => {
  it("buckets daily spending and derives summary stats", () => {
    const summary = summarizeExpenses(expenses, "daily", NOW);

    expect(summary.data).toHaveLength(7);
    expect(summary.total).toBe(30); // only today + yesterday land in the 7-day window
    expect(summary.maxValue).toBe(20); // yesterday is the tallest single day
    expect(summary.activeTotal).toBe(10); // today's bucket
    expect(summary.average).toBeCloseTo(30 / 7, 6);
  });

  it("returns zeroed stats when there is no spending in range", () => {
    const summary = summarizeExpenses([], "daily", NOW);
    expect(summary.total).toBe(0);
    expect(summary.maxValue).toBe(0);
    expect(summary.activeTotal).toBe(0);
    expect(summary.average).toBe(0);
  });

  it("buckets monthly spending into the current month", () => {
    const summary = summarizeExpenses(expenses, "monthly", NOW);
    expect(summary.data).toHaveLength(6);
    // June bucket holds today + yesterday + the 10th; May bucket holds the 30th.
    expect(summary.data[summary.data.length - 1].total).toBe(130);
  });
});
