import SwiftUI

struct ExpenseLoggingView: View {
    @EnvironmentObject private var appState: AppState
    @State private var amountText = ""
    @State private var merchant = ""
    @State private var selectedCategory: ExpenseCategory = .uncategorized
    @State private var isShowingSMSPaste = false

    var body: some View {
        Form {
            Section("Manual expense") {
                TextField("Amount", text: $amountText)
                    .keyboardType(.decimalPad)

                TextField("Merchant", text: $merchant)

                Picker("Category", selection: $selectedCategory) {
                    ForEach(ExpenseCategory.allCases) { category in
                        Text(category.rawValue.capitalized).tag(category)
                    }
                }
            }

            Section {
                Button("Parse SMS text") {
                    isShowingSMSPaste = true
                }

                Button("Save expense") {
                    Task { await saveManualExpense() }
                }
            }

            if let parsed = appState.latestParse {
                Section("Latest parse") {
                    Text(parsed.merchant ?? "Merchant missing")
                    Text(parsed.parserNotes ?? "Review before saving")
                        .foregroundStyle(.secondary)

                    Button("Save parsed expense") {
                        Task { await appState.saveParsedExpense(parsed) }
                    }
                }
            }
        }
        .navigationTitle("Log expense")
        .sheet(isPresented: $isShowingSMSPaste) {
            SMSPasteView()
                .environmentObject(appState)
        }
    }

    private func saveManualExpense() async {
        let normalized = amountText.replacingOccurrences(of: ",", with: ".")
        guard let amount = Double(normalized) else {
            appState.lastErrorMessage = "Enter a valid amount."
            return
        }

        let parsed = ParsedExpense(
            amountMinor: Int((amount * 100).rounded()),
            currencyCode: appState.activeBudget.currencyCode,
            merchant: merchant,
            occurredAt: Date(),
            category: selectedCategory,
            confidence: 1,
            rawText: "",
            source: .manual,
            parserNotes: "Manual entry"
        )

        await appState.saveParsedExpense(parsed)
    }
}

// TODO: Replace manual amount conversion with locale-aware parsing.
// Description: This starter uses `Double` for convenience only. Production entry
// should use NumberFormatter or Decimal to avoid rounding surprises.
