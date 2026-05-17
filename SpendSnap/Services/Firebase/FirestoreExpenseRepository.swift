import Foundation

final class FirestoreExpenseRepository: ExpenseRepository {
    func fetchExpenses() async throws -> [Expense] {
        // TODO: Fetch from `users/{userId}/expenses` ordered by `occurredAt`.
        // Description: Use FirebaseFirestore once dependencies are installed and
        // map timestamps, integer money values, source, and category carefully.
        []
    }

    func saveExpense(_ expense: Expense) async throws {
        // TODO: Upsert an expense document under the signed-in user's collection.
        // Description: Include `createdAt` and source metadata for debugging parser
        // quality and later analytics.
    }

    func deleteExpense(id: String) async throws {
        // TODO: Delete the expense document by id for the signed-in user.
        // Description: Deletions should update summaries and any live activity state.
    }
}

// TODO: Add Firebase Auth dependency to this repository.
// Description: Firestore security rules assume `request.auth.uid`, so repository
// calls need the current user id before touching user-scoped collections.
