import FirebaseFirestore
import Foundation

final class FirestoreExpenseRepository: ExpenseRepository {
    private var expensesCollection: CollectionReference {
        Firestore.firestore().collection("expenses")
    }

    func fetchExpenses() async throws -> [Expense] {
        // The history screen needs the newest expenses first.
        let snapshot = try await expensesCollection
            .order(by: FirestoreField.date, descending: true)
            .getDocuments()

        return snapshot.documents.compactMap(Self.expense(from:))
    }

    func saveExpense(_ expense: Expense) async throws {
        let data: [String: Any] = [
            FirestoreField.amount: Double(expense.amountMinor) / 100,
            FirestoreField.category: expense.category.displayName,
            FirestoreField.notes: expense.notes,
            FirestoreField.date: Timestamp(date: expense.occurredAt)
        ]

        // The document body intentionally matches the MVP Firestore contract.
        try await expensesCollection.document(expense.id).setData(data)
    }

    func deleteExpense(id: String) async throws {
        try await expensesCollection.document(id).delete()
    }

    private static func expense(from document: QueryDocumentSnapshot) -> Expense? {
        let data = document.data()

        guard
            let amount = Self.doubleValue(from: data[FirestoreField.amount]),
            let category = data[FirestoreField.category] as? String,
            let timestamp = data[FirestoreField.date] as? Timestamp
        else {
            return nil
        }

        let parsedCategory = ExpenseCategory(firestoreValue: category)

        return Expense(
            id: document.documentID,
            amountMinor: Int((amount * 100).rounded()),
            currencyCode: "SGD",
            merchant: parsedCategory.displayName,
            category: parsedCategory,
            occurredAt: timestamp.dateValue(),
            source: .manual,
            notes: data[FirestoreField.notes] as? String ?? "",
            createdAt: timestamp.dateValue()
        )
    }

    private static func doubleValue(from value: Any?) -> Double? {
        if let double = value as? Double {
            return double
        }

        if let number = value as? NSNumber {
            return number.doubleValue
        }

        return nil
    }
}

private enum FirestoreField {
    static let amount = "amount"
    static let category = "category"
    static let notes = "notes"
    static let date = "date"
}
