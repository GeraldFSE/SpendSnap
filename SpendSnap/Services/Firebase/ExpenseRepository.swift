import Foundation

protocol ExpenseRepository {
    func fetchExpenses() async throws -> [Expense]
    func saveExpense(_ expense: Expense) async throws
    func deleteExpense(id: String) async throws
}

actor InMemoryExpenseRepository: ExpenseRepository {
    private var expenses: [Expense] = []

    func fetchExpenses() async throws -> [Expense] {
        expenses.sorted { $0.occurredAt > $1.occurredAt }
    }

    func saveExpense(_ expense: Expense) async throws {
        expenses.removeAll { $0.id == expense.id }
        expenses.append(expense)
    }

    func deleteExpense(id: String) async throws {
        expenses.removeAll { $0.id == id }
    }
}

// TODO: Add repository methods for summary queries and pagination.
// Description: The dashboard can start by loading recent expenses, but weekly and
// monthly summaries should avoid downloading all historical records forever.
