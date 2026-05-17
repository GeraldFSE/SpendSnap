import SwiftUI

struct SMSPasteView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var rawText = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Bank SMS") {
                    TextEditor(text: $rawText)
                        .frame(minHeight: 180)
                }
            }
            .navigationTitle("Parse SMS")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Parse") {
                        Task {
                            await appState.parseRawExpenseText(rawText, source: .sms)
                            dismiss()
                        }
                    }
                    .disabled(rawText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

// TODO: Connect this view to the Shortcut/share-sheet path.
// Description: Pasting is a good fallback, but the target experience is that bank
// SMS text arrives here with as little user effort as iOS allows.
