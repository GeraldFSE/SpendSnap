# SpendSnap

SpendSnap is an iOS budgeting app concept from NUS Orbital 2026. The app aims to make expense logging nearly invisible by combining Back Tap logging, SMS/Shortcut intake, AI-assisted parsing, budget status, summaries, and Firebase persistence.

## Current Backbone

This repository currently contains the SwiftUI app source structure, not a checked-in `.xcodeproj`. Create an iOS SwiftUI app target named `SpendSnap`, add the `SpendSnap` folder to the app target, and use `SpendSnap/App/Info.plist` as the target plist so `spendsnap://log` opens the logging form from iOS Shortcuts.

- `SpendSnap/App`: App entry point and shared state.
- `SpendSnap/Models`: Core budget, expense, parsing, and summary data structures.
- `SpendSnap/Views`: SwiftUI screens for dashboard, logging, and settings.
- `SpendSnap/Services`: Feature services for AI parsing, SMS/Shortcut intake, Firebase, budget alerts, and Dynamic Island support.
- `SpendSnap/Utilities`: Small date and currency helpers.
- `Firebase`: Firestore rules, indexes, and backend setup notes.
- `Shortcuts`: Back Tap and iOS Shortcuts integration notes.
- `Docs`: Product, architecture, and TODO planning documents.
- `SpendSnapTests`: Test placeholders for the riskiest logic.

## Setup TODOs

- TODO: Create the Xcode SwiftUI iOS app target and add the `SpendSnap` folder to it.
- TODO: Add the Firebase iOS SDK Swift packages for `FirebaseCore` and `FirebaseFirestore`.
- TODO: Add the real `GoogleService-Info.plist` to the Xcode app target.
- TODO: Add ActivityKit only if the team commits to the Dynamic Island/live activity feature for supported devices.
- TODO: Add OpenAI API access through a secure backend or Firebase Cloud Function rather than storing secrets in the app.
- TODO: Build the iOS Shortcut assigned to Back Tap with the Open URL action set to `spendsnap://log`.

## MVP Firestore Shape

Manual entries are saved to the top-level `expenses` collection with these fields:

- `amount`: `Double`
- `category`: `String`
- `notes`: `String`
- `date`: Firestore `Timestamp`
