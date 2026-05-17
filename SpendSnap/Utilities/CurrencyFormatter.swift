import Foundation

enum CurrencyFormatter {
    static func displayAmount(minorUnits: Int, currencyCode: String) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2

        let majorUnits = Double(minorUnits) / 100
        return formatter.string(from: NSNumber(value: majorUnits)) ?? "\(currencyCode) \(majorUnits)"
    }
}

// TODO: Support currencies with non-2-decimal minor units.
// Description: This helper assumes cents. If SpendSnap expands beyond SGD-like
// currencies, minor-unit conversion should come from a currency metadata table.
