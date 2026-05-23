# Firebase Setup

This folder contains starter Firebase configuration files.

## Firebase TODOs

- TODO: Create a Firebase project for SpendSnap and register the iOS bundle identifier.
- TODO: Download `GoogleService-Info.plist` and add it to the Xcode app target. The real plist is ignored by Git.
- TODO: Add `FirebaseCore` and `FirebaseFirestore` from `https://github.com/firebase/firebase-ios-sdk` in Xcode Package Dependencies.
- TODO: Enable Cloud Firestore and deploy `firestore.rules` plus `firestore.indexes.json`.
- TODO: Enable Firebase Authentication if expenses will sync per user.
- TODO: Tighten the development-only top-level `expenses` rule before sharing real financial data.
- TODO: Consider Firebase Cloud Functions for OpenAI parsing so API keys stay off the device.

## Expense Documents

The app writes manual expenses to `expenses/{expenseId}`:

- `amount`: `Double`
- `category`: `String`
- `notes`: `String`
- `date`: Firestore `Timestamp`
