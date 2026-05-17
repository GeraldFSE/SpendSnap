import Foundation

protocol BudgetAlertScheduling {
    func requestPermissionIfNeeded() async
    func scheduleAlert(for summary: SpendingSummary) async
}

struct BudgetAlertScheduler: BudgetAlertScheduling {
    func requestPermissionIfNeeded() async {
        // TODO: Ask for local notification permission at the right moment.
        // Description: Request after the user creates a budget or turns on alerts,
        // not on first launch.
    }

    func scheduleAlert(for summary: SpendingSummary) async {
        // TODO: Schedule alerts when spending crosses warning thresholds.
        // Description: Suggested first thresholds are 80 percent, 100 percent, and
        // large single transaction spikes.
    }
}
