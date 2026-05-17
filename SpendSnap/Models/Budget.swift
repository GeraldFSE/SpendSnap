import Foundation

struct Budget: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var amountMinor: Int
    var currencyCode: String
    var period: BudgetPeriod
    var category: ExpenseCategory?
    var startsAt: Date

    static let defaultDailyBudget = Budget(
        id: "default-daily-budget",
        name: "Daily budget",
        amountMinor: 2000,
        currencyCode: "SGD",
        period: .daily,
        category: nil,
        startsAt: Date()
    )
}

enum BudgetPeriod: String, CaseIterable, Codable, Identifiable {
    case daily
    case weekly
    case monthly

    var id: String { rawValue }
}

// TODO: Decide if budgets are global or category-specific in the MVP.
// Description: The poster emphasizes remaining daily budget, so a single daily
// budget is the smallest useful version. Category budgets can come later.
