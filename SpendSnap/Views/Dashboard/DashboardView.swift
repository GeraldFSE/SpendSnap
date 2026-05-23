import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            List {
                Section {
                    SummaryCard(
                        summary: appState.budgetCalculator.summary(
                            for: appState.expenses,
                            budget: appState.activeBudget,
                            period: .daily,
                            now: Date()
                        )
                    )
                }

                Section("Recent expenses") {
                    if appState.expenses.isEmpty {
                        Text("No expenses logged yet")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(appState.expenses) { expense in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(expense.category.displayName)
                                    Text(expense.occurredAt.formatted(date: .abbreviated, time: .shortened))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(CurrencyFormatter.displayAmount(
                                    minorUnits: expense.amountMinor,
                                    currencyCode: expense.currencyCode
                                ))
                            }
                        }
                    }
                }
            }
            .navigationTitle("SpendSnap")
            .toolbar {
                NavigationLink {
                    ExpenseLoggingView()
                } label: {
                    Image(systemName: "plus")
                }

                NavigationLink {
                    ExpenseHistoryView()
                } label: {
                    Image(systemName: "clock")
                }

                NavigationLink {
                    SettingsView()
                } label: {
                    Image(systemName: "gearshape")
                }
            }
            .task {
                await appState.loadExpenses()
            }
        }
    }
}

// TODO: Replace the starter list UI with a product-quality dashboard.
// Description: The first screen should show remaining daily budget, quick logging,
// alerts, and recent transactions without becoming a marketing page.
