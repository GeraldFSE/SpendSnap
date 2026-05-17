import Foundation

struct ShortcutPayload {
    var rawText: String
    var source: ExpenseSource
}

protocol ShortcutPayloadHandling {
    func payload(from url: URL) throws -> ShortcutPayload
}

enum ShortcutPayloadError: Error {
    case unsupportedScheme
    case missingRawText
}

struct ShortcutPayloadHandler: ShortcutPayloadHandling {
    func payload(from url: URL) throws -> ShortcutPayload {
        guard url.scheme == "spendsnap" else {
            throw ShortcutPayloadError.unsupportedScheme
        }

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let rawText = components?
            .queryItems?
            .first(where: { $0.name == "rawText" })?
            .value?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard let rawText, !rawText.isEmpty else {
            throw ShortcutPayloadError.missingRawText
        }

        return ShortcutPayload(rawText: rawText, source: .shortcut)
    }
}

// TODO: Add App Intents as a richer alternative to URL schemes.
// Description: App Intents can make Shortcut setup cleaner and may support a more
// reliable Back Tap flow than manually assembled URLs.
