import Foundation

struct DateRange: Equatable {
    var start: Date
    var end: Date

    func contains(_ date: Date) -> Bool {
        date >= start && date < end
    }

    static func containing(
        _ date: Date,
        period: BudgetPeriod,
        calendar: Calendar = .current
    ) -> DateRange {
        switch period {
        case .daily:
            let start = calendar.startOfDay(for: date)
            let end = calendar.date(byAdding: .day, value: 1, to: start) ?? date
            return DateRange(start: start, end: end)

        case .weekly:
            let interval = calendar.dateInterval(of: .weekOfYear, for: date)
            return DateRange(start: interval?.start ?? date, end: interval?.end ?? date)

        case .monthly:
            let interval = calendar.dateInterval(of: .month, for: date)
            return DateRange(start: interval?.start ?? date, end: interval?.end ?? date)
        }
    }
}

// TODO: Confirm the user's intended budgeting timezone.
// Description: A Singapore user may travel or have transactions posted in another
// timezone. Budget periods should be calculated in the user's chosen home timezone.
