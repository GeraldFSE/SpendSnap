# Architecture Notes

## High-Level Flow

1. A user triggers logging through Back Tap, a Shortcut, manual entry, or pasted SMS text.
2. `ShortcutPayloadHandler` or a logging view normalizes the raw input.
3. `ExpenseParsingClient` turns raw text into a structured `ParsedExpense`.
4. The user confirms or edits the parsed expense.
5. `ExpenseRepository` persists the final `Expense`.
6. `BudgetCalculator` and summary views update totals, alerts, and optional live activity state.

## Suggested App Layers

- Models: Plain Swift structs that can be encoded into Firestore documents.
- Views: SwiftUI screens with minimal business logic.
- Services: Parsing, persistence, budget calculations, alerts, Shortcut intake, and live activities.
- Utilities: Formatting and date-range helpers.

## Architecture TODOs

- TODO: Choose dependency injection style. A lightweight `AppState` is fine for early MVP work, but protocols are already sketched for services that will be mocked in tests.
- TODO: Decide whether OpenAI parsing runs directly from the app or through a backend. The safer production route is a backend because mobile apps cannot keep API keys secret.
- TODO: Map Firestore collections before implementation. A likely first structure is `users/{userId}/expenses/{expenseId}` and `users/{userId}/budgets/{budgetId}`.
- TODO: Add offline-first behavior. Expense logging should queue locally when the network is unavailable, then sync later.
