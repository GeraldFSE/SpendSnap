import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Form {
            Section("Budget") {
                Text(appState.activeBudget.name)
                Text(CurrencyFormatter.displayAmount(
                    minorUnits: appState.activeBudget.amountMinor,
                    currencyCode: appState.activeBudget.currencyCode
                ))
            }

            Section("Integrations") {
                Label("Firebase", systemImage: "externaldrive.connected.to.line.below")
                Label("OpenAI parser", systemImage: "text.magnifyingglass")
                Label("Back Tap Shortcut", systemImage: "hand.tap")
            }
        }
        .navigationTitle("Settings")
    }
}

// TODO: Add editable budget settings and integration status checks.
// Description: Settings should eventually show whether Firebase, notification
// permissions, live activities, and Shortcut setup are ready.
