import SwiftUI

struct ExpenseHistoryView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        List {
            if appState.expenses.isEmpty {
                Text("No expenses yet")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(appState.expenses) { expense in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(expense.category.displayName)
                                .font(.headline)
                            Text(expense.occurredAt.formatted(date: .abbreviated, time: .shortened))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Text(CurrencyFormatter.displayAmount(
                            minorUnits: expense.amountMinor,
                            currencyCode: expense.currencyCode
                        ))
                        .font(.body.weight(.semibold))
                    }
                }
            }
        }
        .navigationTitle("Expense History")
        .task {
            // Refresh from Firestore whenever the history screen opens.
            await appState.loadExpenses()
        }
    }
}
