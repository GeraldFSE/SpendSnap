// Pure monthly-budget status logic, extracted so it can be unit tested.
import { formatCurrency } from "./currency";

export const BUDGET_COLORS = {
  onTrack: "#16A34A",
  warning: "#D97706",
  exceeded: "#DC2626"
};

export function getBudgetAlertDecision(budget, ratio, monthKey) {
  const warningThreshold = Number(budget?.warningThreshold ?? 0.8);
  const exceededThreshold = Number(budget?.exceededThreshold ?? 1);
  const sameMonth = budget?.alertMonth === monthKey;
  const warningMatches =
    Number(budget?.alertedWarningThreshold ?? 0.8) === warningThreshold;
  const exceededMatches =
    Number(budget?.alertedExceededThreshold ?? 1) === exceededThreshold;
  const alreadyWarned =
    sameMonth && warningMatches && Boolean(budget?.alertedWarning ?? budget?.alerted80);
  const alreadyExceeded =
    sameMonth && exceededMatches && Boolean(budget?.alertedExceeded ?? budget?.alerted100);
  let alertedWarning = alreadyWarned;
  let alertedExceeded = alreadyExceeded;
  let notificationLevel = null;

  if (ratio >= exceededThreshold && !alreadyExceeded) {
    alertedWarning = true;
    alertedExceeded = true;
    notificationLevel = "exceeded";
  } else if (ratio >= warningThreshold && !alreadyWarned) {
    alertedWarning = true;
    notificationLevel = "warning";
  }

  return {
    warningThreshold,
    exceededThreshold,
    alertedWarning,
    alertedExceeded,
    notificationLevel
  };
}

// Derives the budget status (label, color, detail copy, progress) from a budget doc
// and the amount spent this month.
export function getBudgetState(budget, monthlySpent) {
  const budgetAmount = Number(budget?.amount) || 0;
  const warningThreshold = Number(budget?.warningThreshold ?? 0.8);
  const exceededThreshold = Number(budget?.exceededThreshold ?? 1);
  const hasBudget = budgetAmount > 0;
  const ratio = hasBudget ? monthlySpent / budgetAmount : 0;
  const progress = Math.min(ratio, 1);

  if (!hasBudget) {
    return {
      hasBudget,
      budgetAmount,
      color: BUDGET_COLORS.onTrack,
      detail: "Set a monthly limit to track your pace.",
      progress,
      status: "No budget set"
    };
  }

  if (ratio >= exceededThreshold) {
    return {
      hasBudget,
      budgetAmount,
      color: BUDGET_COLORS.exceeded,
      detail: `${formatCurrency(monthlySpent - budgetAmount)} over budget`,
      progress,
      status: "Budget exceeded"
    };
  }

  if (ratio >= warningThreshold) {
    return {
      hasBudget,
      budgetAmount,
      color: BUDGET_COLORS.warning,
      detail: `${formatCurrency(budgetAmount - monthlySpent)} left this month`,
      progress,
      status: "Nearing monthly budget"
    };
  }

  return {
    hasBudget,
    budgetAmount,
    color: BUDGET_COLORS.onTrack,
    detail: `${formatCurrency(budgetAmount - monthlySpent)} left this month`,
    progress,
    status: "On track"
  };
}
