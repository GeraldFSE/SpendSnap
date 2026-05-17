import SwiftUI

@main
struct SpendSnapApp: App {
    @StateObject private var appState = AppState.makeDefault()

    init() {
        // TODO: Configure Firebase once the iOS project includes FirebaseCore.
        // Description: Add `FirebaseApp.configure()` here after adding the real
        // GoogleService-Info.plist to the Xcode target.
    }

    var body: some Scene {
        WindowGroup {
            DashboardView()
                .environmentObject(appState)
                .onOpenURL { url in
                    appState.handleIncomingURL(url)
                }
        }
    }
}
