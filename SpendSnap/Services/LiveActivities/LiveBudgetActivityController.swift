import Foundation

protocol LiveBudgetActivityControlling {
    func startOrUpdate(summary: SpendingSummary) async
    func stop() async
}

struct LiveBudgetActivityController: LiveBudgetActivityControlling {
    func startOrUpdate(summary: SpendingSummary) async {
        // TODO: Implement ActivityKit live activity updates for supported devices.
        // Description: The poster's Dynamic Island feature maps here. Keep the live
        // state small: remaining budget, color status, and latest update time.
    }

    func stop() async {
        // TODO: End the live activity when budgets are disabled or the day ends.
        // Description: Avoid stale Dynamic Island status that shows yesterday's budget.
    }
}

// TODO: Add an ActivityKit extension target.
// Description: Dynamic Island and Lock Screen presentation require a widget/live
// activity extension in addition to the main app target.
