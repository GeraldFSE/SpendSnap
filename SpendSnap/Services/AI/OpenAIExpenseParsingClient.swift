import Foundation

final class OpenAIExpenseParsingClient: ExpenseParsingClient {
    func parse(rawText: String) async throws -> ParsedExpense {
        guard !rawText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ExpenseParsingError.emptyInput
        }

        // TODO: Call a secure backend or Firebase Cloud Function that talks to OpenAI.
        // Description: Do not store OpenAI API keys in the iOS app. The backend should
        // accept raw SMS text and return a strict JSON payload matching ParsedExpense.
        throw ExpenseParsingError.backendUnavailable
    }
}

// TODO: Define the production prompt and response schema.
// Description: The parser needs to extract amount, merchant, date/time, currency,
// category, and uncertainty notes from noisy bank SMS text.
