// Date helpers shared by the Home and Summary screens. Kept pure (no React/Firebase)
// so they can be unit tested directly.

const dayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric"
});

const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric"
});

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short"
});

// Normalizes the many shapes an expense `date` can take (Firestore Timestamp, a
// {seconds,nanoseconds} estimate, a Date, or a parseable string/number) into a Date,
// or null when it can't be interpreted.
export function toExpenseDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1000000));
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function startOfWeek(date) {
  const nextDate = startOfDay(date);
  const dayOffset = (nextDate.getDay() + 6) % 7;
  nextDate.setDate(nextDate.getDate() - dayOffset);
  return nextDate;
}

export function startOfMonth(date) {
  const nextDate = startOfDay(date);
  nextDate.setDate(1);
  return nextDate;
}

export function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

export function addMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

export function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function weekKey(date) {
  return dayKey(startOfWeek(date));
}

export function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

export function getRangeKey(date, period) {
  if (period === "weekly") {
    return weekKey(date);
  }

  if (period === "monthly") {
    return monthKey(date);
  }

  return dayKey(date);
}

export function getPeriodStart(date, period) {
  if (period === "weekly") {
    return startOfWeek(date);
  }

  if (period === "monthly") {
    return startOfMonth(date);
  }

  return startOfDay(date);
}

export function getPeriodLabel(date, period) {
  if (period === "weekly") {
    return dateLabelFormatter.format(date);
  }

  if (period === "monthly") {
    return monthLabelFormatter.format(date);
  }

  return dayLabelFormatter.format(date);
}
