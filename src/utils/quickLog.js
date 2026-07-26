export const QUICK_LOG_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Others"];

export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? "");

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }

  return parsed;
}

export function normalizeQuickLogResult(value) {
  const result = value && typeof value === "object" ? value : {};
  const amount = Number(result.amount);
  const category = QUICK_LOG_CATEGORIES.includes(result.category) ? result.category : null;
  const type = result.type === "expense" || result.type === "income" ? result.type : null;
  const date = parseLocalDate(result.date) ? result.date : null;

  return {
    merchant: typeof result.merchant === "string" && result.merchant.trim() ? result.merchant.trim() : null,
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    category,
    type,
    date,
    message: typeof result.message === "string" ? result.message.trim() : ""
  };
}
