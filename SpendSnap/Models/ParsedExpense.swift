import Foundation

struct ParsedExpense: Equatable {
    var amountMinor: Int?
    var currencyCode: String
    var merchant: String?
    var occurredAt: Date?
    var category: ExpenseCategory?
    var confidence: Double
    var rawText: String
    var source: ExpenseSource
    var parserNotes: String?

    static func empty(rawText: String, source: ExpenseSource = .manual) -> ParsedExpense {
        ParsedExpense(
            amountMinor: nil,
            currencyCode: "SGD",
            merchant: nil,
            occurredAt: nil,
            category: nil,
            confidence: 0,
            rawText: rawText,
            source: source,
            parserNotes: nil
        )
    }
}

// TODO: Create a JSON schema for AI parser responses.
// Description: The OpenAI parsing path should return this shape exactly so the
// confirmation UI can show uncertainty and ask the user to fill missing fields.
