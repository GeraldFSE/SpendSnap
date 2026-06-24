// Pure expense-aggregation helpers shared across screens. No React/Firebase deps so
// they can be unit tested directly.
import {
  addDays,
  addMonths,
  addWeeks,
  getPeriodLabel,
  getPeriodStart,
  getRangeKey,
  startOfMonth,
  toExpenseDate
} from "./dates";

export const PERIODS = [
  { key: "daily", label: "Daily", count: 7 },
  { key: "weekly", label: "Weekly", count: 6 },
  { key: "monthly", label: "Monthly", count: 6 }
];

// Totals the amounts in `expenses` whose date falls within [start, end).
export function sumExpensesInRange(expenses, start, end) {
  return expenses.reduce((total, expense) => {
    const expenseDate = toExpenseDate(expense.date);
    const amount = Number(expense.amount);

    if (!expenseDate || Number.isNaN(amount) || expenseDate < start || expenseDate >= end) {
      return total;
    }

    return total + amount;
  }, 0);
}

export function summarizeCurrentMonth(expenses, now = new Date()) {
  const start = startOfMonth(now);
  const end = addMonths(start, 1);
  return sumExpensesInRange(expenses, start, end);
}

// Groups expenses by category with each category's share of the total.
export function summarizeByCategory(expenses) {
  const totals = new Map();

  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    const category = expense.category || "Others";
    totals.set(category, (totals.get(category) ?? 0) + amount);
  });

  const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? amount / total : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Builds the trailing set of empty buckets for a period (e.g. the last 7 days).
export function buildRanges(period, now = new Date()) {
  const count = PERIODS.find((item) => item.key === period)?.count ?? 6;
  const currentStart = getPeriodStart(now, period);

  return Array.from({ length: count }, (_, index) => {
    const distanceFromCurrent = count - index - 1;
    let date = addDays(currentStart, -distanceFromCurrent);

    if (period === "weekly") {
      date = addWeeks(currentStart, -distanceFromCurrent);
    }

    if (period === "monthly") {
      date = addMonths(currentStart, -distanceFromCurrent);
    }

    return {
      key: getRangeKey(date, period),
      label: getPeriodLabel(date, period),
      total: 0
    };
  });
}

// Buckets expenses into the trailing periods and derives the chart summary stats.
export function summarizeExpenses(expenses, period, now = new Date()) {
  const ranges = buildRanges(period, now);
  const totalsByKey = ranges.reduce((totals, range) => {
    totals[range.key] = 0;
    return totals;
  }, {});

  expenses.forEach((expense) => {
    const expenseDate = toExpenseDate(expense.date);
    const amount = Number(expense.amount);

    if (!expenseDate || Number.isNaN(amount)) {
      return;
    }

    const key = getRangeKey(expenseDate, period);

    if (Object.prototype.hasOwnProperty.call(totalsByKey, key)) {
      totalsByKey[key] += amount;
    }
  });

  const data = ranges.map((range) => ({ ...range, total: totalsByKey[range.key] }));
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const maxValue = Math.max(...data.map((item) => item.total), 0);
  const activeTotal = data[data.length - 1]?.total ?? 0;
  const average = data.length > 0 ? total / data.length : 0;

  return { data, total, maxValue, activeTotal, average };
}
