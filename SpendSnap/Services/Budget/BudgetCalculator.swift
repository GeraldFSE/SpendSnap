import Foundation

protocol BudgetCalculating {
    func summary(
        for expenses: [Expense],
        budget: Budget,
        period: BudgetPeriod,
        now: Date
    ) -> SpendingSummary
}

struct BudgetCalculator: BudgetCalculating {
    func summary(
        for expenses: [Expense],
        budget: Budget,
        period: BudgetPeriod,
        now: Date
    ) -> SpendingSummary {
        let dateRange = DateRange.containing(now, period: period)
        let matchingExpenses = expenses.filter { expense in
            dateRange.contains(expense.occurredAt)
            && (budget.category == nil || budget.category == expense.category)
        }

        let total = matchingExpenses.reduce(0) { $0 + $1.amountMinor }
        let categoryTotals = Dictionary(grouping: matchingExpenses, by: \.category)
            .map { category, expenses in
                CategorySpend(
                    category: category,
                    totalMinor: expenses.reduce(0) { $0 + $1.amountMinor }
                )
            }
            .sorted { $0.totalMinor > $1.totalMinor }

        return SpendingSummary(
            period: period,
            dateRange: dateRange,
            totalSpentMinor: total,
            budgetMinor: budget.amountMinor,
            currencyCode: budget.currencyCode,
            topCategories: Array(categoryTotals.prefix(3))
        )
    }
}

// TODO: Add budget rollover and recurring reset rules.
// Description: Daily budget math is simple at first, but weekly/monthly views need
// clear date boundaries, time zones, and behavior around unspent amounts.
