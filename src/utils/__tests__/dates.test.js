import {
  addDays,
  addMonths,
  addWeeks,
  dayKey,
  getPeriodStart,
  getRangeKey,
  monthKey,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toExpenseDate,
  weekKey
} from "../dates";

describe("toExpenseDate", () => {
  it("returns null for falsy input", () => {
    expect(toExpenseDate(null)).toBeNull();
    expect(toExpenseDate(undefined)).toBeNull();
    expect(toExpenseDate(0)).toBeNull();
  });

  it("uses a Firestore Timestamp's toDate()", () => {
    const date = new Date("2026-01-02T03:04:05Z");
    const timestamp = { toDate: () => date };
    expect(toExpenseDate(timestamp)).toBe(date);
  });

  it("passes through a valid Date", () => {
    const date = new Date("2026-06-24T00:00:00Z");
    expect(toExpenseDate(date)).toBe(date);
  });

  it("returns null for an invalid Date", () => {
    expect(toExpenseDate(new Date("not-a-date"))).toBeNull();
  });

  it("reconstructs from {seconds, nanoseconds}", () => {
    const result = toExpenseDate({ seconds: 1700000000, nanoseconds: 500000000 });
    expect(result.getTime()).toBe(1700000000 * 1000 + 500);
  });

  it("parses date strings and epoch numbers", () => {
    expect(toExpenseDate("2026-06-24T00:00:00Z").getTime()).toBe(Date.parse("2026-06-24T00:00:00Z"));
    expect(toExpenseDate(1700000000000).getTime()).toBe(1700000000000);
  });

  it("returns null for unparseable strings", () => {
    expect(toExpenseDate("hello")).toBeNull();
  });
});

describe("start-of helpers", () => {
  it("startOfDay zeroes the time", () => {
    const result = startOfDay(new Date("2026-06-24T13:45:30"));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getDate()).toBe(24);
  });

  it("startOfMonth goes to the 1st at midnight", () => {
    const result = startOfMonth(new Date("2026-06-24T13:45:30"));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(5); // June (0-indexed)
    expect(result.getHours()).toBe(0);
  });

  it("startOfWeek snaps to Monday", () => {
    // 2026-06-24 is a Wednesday; Monday of that week is 2026-06-22.
    const result = startOfWeek(new Date("2026-06-24T13:45:30"));
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(22);
  });

  it("startOfWeek treats Sunday as the end of the week", () => {
    // 2026-06-28 is a Sunday; its Monday is still 2026-06-22.
    const result = startOfWeek(new Date("2026-06-28T10:00:00"));
    expect(result.getDate()).toBe(22);
  });
});

describe("add helpers", () => {
  it("addDays moves forward and backward across month boundaries", () => {
    expect(addDays(new Date("2026-01-31T00:00:00"), 1).getDate()).toBe(1);
    expect(addDays(new Date("2026-03-01T00:00:00"), -1).getMonth()).toBe(1); // Feb
  });

  it("addWeeks adds 7 days per week", () => {
    const result = addWeeks(new Date("2026-06-01T00:00:00"), 2);
    expect(result.getDate()).toBe(15);
  });

  it("addMonths handles year rollover", () => {
    const result = addMonths(new Date("2026-12-15T00:00:00"), 1);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(0); // January
  });

  it("does not mutate the input date", () => {
    const input = new Date("2026-06-24T00:00:00");
    const snapshot = input.getTime();
    addDays(input, 5);
    addMonths(input, 3);
    expect(input.getTime()).toBe(snapshot);
  });
});

describe("range keys", () => {
  const date = new Date("2026-06-24T12:00:00");

  it("dayKey / monthKey are stable for the same day/month", () => {
    expect(dayKey(date)).toBe("2026-6-24");
    expect(monthKey(date)).toBe("2026-6");
  });

  it("weekKey equals the dayKey of the week's Monday", () => {
    expect(weekKey(date)).toBe(dayKey(startOfWeek(date)));
  });

  it("getRangeKey dispatches by period", () => {
    expect(getRangeKey(date, "daily")).toBe(dayKey(date));
    expect(getRangeKey(date, "weekly")).toBe(weekKey(date));
    expect(getRangeKey(date, "monthly")).toBe(monthKey(date));
  });

  it("getPeriodStart dispatches by period", () => {
    expect(getPeriodStart(date, "daily").getTime()).toBe(startOfDay(date).getTime());
    expect(getPeriodStart(date, "weekly").getTime()).toBe(startOfWeek(date).getTime());
    expect(getPeriodStart(date, "monthly").getTime()).toBe(startOfMonth(date).getTime());
  });
});
