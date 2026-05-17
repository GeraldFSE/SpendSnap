import Foundation

protocol ExpenseParsingClient {
    func parse(rawText: String) async throws -> ParsedExpense
}

enum ExpenseParsingError: Error {
    case emptyInput
    case unsupportedFormat
    case backendUnavailable
}

// TODO: Add parser confidence thresholds.
// Description: Low-confidence parses should require user confirmation, while
// high-confidence parses may be saved with a lighter review flow.
