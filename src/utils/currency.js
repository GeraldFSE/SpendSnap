// Single source of truth for money formatting. The app tracks Singapore dollars.
const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 2
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  notation: "compact",
  maximumFractionDigits: 1
});

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

export function formatCompactCurrency(value) {
  const amount = Number(value) || 0;

  if (amount === 0) {
    return "$0";
  }

  return compactCurrencyFormatter.format(amount);
}
