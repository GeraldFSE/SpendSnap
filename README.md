# SpendSnap

SpendSnap is an iOS budgeting app concept from NUS Orbital 2026. The app aims to make expense logging nearly invisible by combining Back Tap logging, SMS/Shortcut intake, AI-assisted parsing, budget status, summaries, and Firebase persistence.

## Current Backbone

This repository currently contains a starter structure, not a finished Xcode project. The folders are organized so the team can create an Xcode SwiftUI app and add these files to the relevant app and test targets.

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
- TODO: Add Firebase iOS SDK packages for Auth and Firestore once the Firebase project is created.
- TODO: Add ActivityKit only if the team commits to the Dynamic Island/live activity feature for supported devices.
- TODO: Add OpenAI API access through a secure backend or Firebase Cloud Function rather than storing secrets in the app.
- TODO: Build the iOS Shortcut that accepts pasted/shared bank SMS text and opens SpendSnap with a URL payload.
