import FirebaseCore
import SwiftUI

@main
struct SpendSnapApp: App {
    @StateObject private var appState = AppState.makeDefault()

    init() {
        // Firebase reads GoogleService-Info.plist from the app target at launch.
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            DashboardView()
                .environmentObject(appState)
                .onOpenURL { url in
                    appState.handleIncomingURL(url)
                }
                .sheet(isPresented: $appState.isShowingExpenseLogger) {
                    NavigationStack {
                        ExpenseLoggingView()
                    }
                    .environmentObject(appState)
                }
        }
    }
}
