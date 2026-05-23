import SwiftUI

struct ExpenseLoggingView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var amountText = ""
    @State private var selectedCategory: ExpenseCategory = .food
    @State private var notes = ""
    @State private var isShowingSMSPaste = false
    @State private var isSaving = false
    @State private var didSave = false

    var body: some View {
        Form {
            Section("Manual expense") {
                TextField("Amount", text: $amountText)
                    .keyboardType(.decimalPad)

                Picker("Category", selection: $selectedCategory) {
                    ForEach(ExpenseCategory.allCases) { category in
                        Text(category.displayName).tag(category)
                    }
                }

                TextField("Notes (optional)", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }

            if didSave {
                Section {
                    Label("Expense saved", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
            }

            Section {
                Button("Parse SMS text") {
                    isShowingSMSPaste = true
                }

                Button(isSaving ? "Saving..." : "Submit") {
                    Task { await saveManualExpense() }
                }
                .disabled(isSaving || amountText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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

        isSaving = true
        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let expense = Expense(
            amountMinor: Int((amount * 100).rounded()),
            currencyCode: appState.activeBudget.currencyCode,
            merchant: selectedCategory.displayName,
            category: selectedCategory,
            occurredAt: Date(),
            source: .manual,
            notes: trimmedNotes
        )

        if await appState.saveExpense(expense) {
            resetForm()
            didSave = true
            try? await Task.sleep(nanoseconds: 700_000_000)
            dismiss()
        }

        isSaving = false
    }

    private func resetForm() {
        amountText = ""
        selectedCategory = .food
        notes = ""
    }
}

// TODO: Replace manual amount conversion with locale-aware parsing.
// Description: This starter uses `Double` for convenience only. Production entry
// should use NumberFormatter or Decimal to avoid rounding surprises.
