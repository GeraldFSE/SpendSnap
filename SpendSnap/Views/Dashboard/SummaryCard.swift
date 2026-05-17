import SwiftUI

struct SummaryCard: View {
    let summary: SpendingSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(summary.period.rawValue.capitalized)
                .font(.headline)

            Text(CurrencyFormatter.displayAmount(
                minorUnits: summary.remainingMinor,
                currencyCode: summary.currencyCode
            ))
            .font(.largeTitle.bold())
            .foregroundStyle(summary.hasExceededBudget ? .red : .green)

            Text("spent \(CurrencyFormatter.displayAmount(minorUnits: summary.totalSpentMinor, currencyCode: summary.currencyCode))")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 8)
    }
}

// TODO: Add progress visualization and alert state.
// Description: Dynamic Island and lock screen states should match the same budget
// color rules shown here so users see consistent green/red feedback.
