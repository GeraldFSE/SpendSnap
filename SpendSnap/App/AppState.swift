import Combine
import Foundation

@MainActor
final class AppState: ObservableObject {
    @Published var expenses: [Expense] = []
    @Published var activeBudget: Budget = .defaultDailyBudget
    @Published var latestParse: ParsedExpense?
    @Published var lastErrorMessage: String?

    let parser: ExpenseParsingClient
    let repository: ExpenseRepository
    let budgetCalculator: BudgetCalculating
    let shortcutPayloadHandler: ShortcutPayloadHandling

    init(
        parser: ExpenseParsingClient,
        repository: ExpenseRepository,
        budgetCalculator: BudgetCalculating,
        shortcutPayloadHandler: ShortcutPayloadHandling
    ) {
        self.parser = parser
        self.repository = repository
        self.budgetCalculator = budgetCalculator
        self.shortcutPayloadHandler = shortcutPayloadHandler
    }

    static func makeDefault() -> AppState {
        AppState(
            parser: RuleBasedSMSExpenseParser(),
            repository: InMemoryExpenseRepository(),
            budgetCalculator: BudgetCalculator(),
            shortcutPayloadHandler: ShortcutPayloadHandler()
        )
    }

    func loadExpenses() async {
        do {
            expenses = try await repository.fetchExpenses()
        } catch {
            lastErrorMessage = "Unable to load expenses."
            // TODO: Add user-visible retry and offline recovery.
            // Description: Logging should remain useful even if Firestore is unreachable.
        }
    }

    func handleIncomingURL(_ url: URL) {
        do {
            let payload = try shortcutPayloadHandler.payload(from: url)
            Task {
                await parseRawExpenseText(payload.rawText, source: .shortcut)
            }
        } catch {
            lastErrorMessage = "SpendSnap could not read the Shortcut payload."
        }
    }

    func parseRawExpenseText(_ rawText: String, source: ExpenseSource) async {
        do {
            var parsed = try await parser.parse(rawText: rawText)
            parsed.source = source
            latestParse = parsed
        } catch {
            lastErrorMessage = "SpendSnap could not parse this expense yet."
            // TODO: Capture failed parse examples with explicit user consent.
            // Description: Real SMS formats vary by bank, so failed examples will help
            // improve prompts, regex fallbacks, and category suggestions.
        }
    }

    func saveParsedExpense(_ parsedExpense: ParsedExpense) async {
        guard let expense = Expense(parsedExpense: parsedExpense) else {
            lastErrorMessage = "Please fill in the missing expense details."
            return
        }

        do {
            try await repository.saveExpense(expense)
            expenses.insert(expense, at: 0)
            latestParse = nil
        } catch {
            lastErrorMessage = "Unable to save this expense."
        }
    }
}
