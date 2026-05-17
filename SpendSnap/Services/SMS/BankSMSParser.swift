import Foundation

final class RuleBasedSMSExpenseParser: ExpenseParsingClient {
    func parse(rawText: String) async throws -> ParsedExpense {
        let trimmed = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw ExpenseParsingError.emptyInput
        }

        let amountMinor = Self.extractFirstAmountMinor(from: trimmed)
        let merchant = Self.extractMerchantGuess(from: trimmed)

        return ParsedExpense(
            amountMinor: amountMinor,
            currencyCode: Self.extractCurrencyCode(from: trimmed) ?? "SGD",
            merchant: merchant,
            occurredAt: Date(),
            category: .uncategorized,
            confidence: amountMinor == nil ? 0.25 : 0.55,
            rawText: rawText,
            source: .sms,
            parserNotes: "Rule-based starter parse. Confirm before saving."
        )
    }

    private static func extractFirstAmountMinor(from text: String) -> Int? {
        let pattern = #"(?i)(?:SGD|S\$|\$)?\s*([0-9]+(?:[.,][0-9]{2})?)"#
        guard
            let regex = try? NSRegularExpression(pattern: pattern),
            let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
            let range = Range(match.range(at: 1), in: text)
        else {
            return nil
        }

        let normalized = text[range].replacingOccurrences(of: ",", with: ".")
        guard let amount = Double(normalized) else {
            return nil
        }

        return Int((amount * 100).rounded())
    }

    private static func extractCurrencyCode(from text: String) -> String? {
        if text.localizedCaseInsensitiveContains("SGD") || text.contains("S$") {
            return "SGD"
        }

        if text.localizedCaseInsensitiveContains("USD") {
            return "USD"
        }

        return nil
    }

    private static func extractMerchantGuess(from text: String) -> String? {
        let keywords = [" at ", " AT ", "merchant ", "MERCHANT "]

        for keyword in keywords {
            guard let range = text.range(of: keyword) else {
                continue
            }

            let suffix = text[range.upperBound...]
            let merchant = suffix
                .split(whereSeparator: { $0 == "." || $0 == "\n" })
                .first
                .map(String.init)?
                .trimmingCharacters(in: .whitespacesAndNewlines)

            if let merchant, !merchant.isEmpty {
                return merchant
            }
        }

        return nil
    }
}

// TODO: Replace starter regexes with bank-specific fixtures and AI fallback.
// Description: DBS, OCBC, UOB, Revolut, Wise, and card networks all format alerts
// differently. Tests should capture examples before parser rules grow.
