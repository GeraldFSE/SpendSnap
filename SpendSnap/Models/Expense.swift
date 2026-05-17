import Foundation

struct Expense: Identifiable, Codable, Equatable {
    let id: String
    var amountMinor: Int
    var currencyCode: String
    var merchant: String
    var category: ExpenseCategory
    var occurredAt: Date
    var source: ExpenseSource
    var rawText: String?
    var createdAt: Date

    init(
        id: String = UUID().uuidString,
        amountMinor: Int,
        currencyCode: String,
        merchant: String,
        category: ExpenseCategory,
        occurredAt: Date,
        source: ExpenseSource,
        rawText: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.amountMinor = amountMinor
        self.currencyCode = currencyCode
        self.merchant = merchant
        self.category = category
        self.occurredAt = occurredAt
        self.source = source
        self.rawText = rawText
        self.createdAt = createdAt
    }

    init?(parsedExpense: ParsedExpense) {
        guard
            let amountMinor = parsedExpense.amountMinor,
            let merchant = parsedExpense.merchant?.trimmingCharacters(in: .whitespacesAndNewlines),
            !merchant.isEmpty
        else {
            return nil
        }

        self.init(
            amountMinor: amountMinor,
            currencyCode: parsedExpense.currencyCode,
            merchant: merchant,
            category: parsedExpense.category ?? .uncategorized,
            occurredAt: parsedExpense.occurredAt ?? Date(),
            source: parsedExpense.source,
            rawText: parsedExpense.rawText
        )
    }
}

enum ExpenseCategory: String, CaseIterable, Codable, Identifiable {
    case food
    case transport
    case groceries
    case shopping
    case bills
    case entertainment
    case uncategorized

    var id: String { rawValue }
}

enum ExpenseSource: String, Codable {
    case manual
    case shortcut
    case sms
    case aiSuggestion
}

// TODO: Confirm whether `amountMinor` should always be cents.
// Description: Storing money as an integer avoids floating-point issues, but every
// supported currency needs a known minor-unit rule.
