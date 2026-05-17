import Foundation

struct SpendingSummary: Equatable {
    var period: BudgetPeriod
    var dateRange: DateRange
    var totalSpentMinor: Int
    var budgetMinor: Int
    var currencyCode: String
    var topCategories: [CategorySpend]

    var remainingMinor: Int {
        budgetMinor - totalSpentMinor
    }

    var hasExceededBudget: Bool {
        remainingMinor < 0
    }
}

struct CategorySpend: Identifiable, Equatable {
    var id: ExpenseCategory { category }
    var category: ExpenseCategory
    var totalMinor: Int
}

// TODO: Add trend metadata for weekly and monthly summaries.
// Description: Summaries should eventually compare current spend against previous
// periods and surface categories responsible for spikes.
