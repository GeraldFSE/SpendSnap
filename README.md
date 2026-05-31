# SpendSnap

Budget tracking made easier.

SpendSnap is an Expo managed React Native app that helps people log expenses quickly, review spending patterns, and build better budget awareness without the friction of opening a full budgeting workflow every time they spend.

Project team: 404: Hackers Not Found  
Apollo 11, NUS Orbital 2026  
Gabriel and Gerald

## Problem Motivation

Most budgeting apps fail because recording expenses is too inconvenient. People forget, skip entries, or give up once logging starts to feel like a chore.

SpendSnap is built around the idea that a budget tracker should log itself as much as possible. The app reduces manual steps through quick expense entry, planned SMS parsing, shared group budgets, and spending summaries that make patterns visible before users overspend.

## Proposed Core Features

- Quick Actions logging: Long press the app icon to open the expense form without navigating through the app. Status: Implemented.
- Manual expense logging: Add amount, category, and optional notes for each expense. Status: Implemented.
- Spending summaries: View daily, weekly, and monthly totals as charts. Status: Implemented.
- Auto SMS parsing: Detect bank SMS alerts and parse amount, merchant, and category automatically. Status: Planned.
- Shared Snaps: Share a budget with friends or family and keep expenses synced across members' devices. Status: Planned.
- Alerts and limits: Set budget limits and receive reminders before overspending. Status: Planned.

## User Stories

- As a busy user, I want to log an expense in a few taps so I can keep my budget updated without interrupting my day.
- As a user who forgets to record purchases, I want bank SMS alerts to be parsed automatically so my spending history stays accurate.
- As a user managing group expenses, I want to share a budget with friends or family so everyone can see updated spending in real time.
- As a budget-conscious user, I want daily, weekly, and monthly charts so I can understand where my money is going.
- As a user with a spending limit, I want alerts before I overspend so I can adjust my behavior early.

## Design And Plan

SpendSnap is designed around low-friction logging and fast feedback.

1. Quick capture
   - Users can open the Add Expense screen from the app icon quick action.
   - The expense form keeps the required fields minimal: amount and category, with optional notes.

2. Automatic capture
   - SMS parsing will use an AI-assisted parser to extract spending details from bank alerts.
   - Parsed expenses should be reviewed or saved automatically depending on confidence and future app settings.

3. Shared budgets
   - Shared Snaps will group expenses by shared budget or household.
   - Firestore will keep group expenses synced across members in real time.

4. Spending insight
   - The Summary tab aggregates expenses into daily, weekly, and monthly totals.
   - Chart views help users spot spikes, trends, and current-period spending quickly.

5. Budget control
   - Future budget limits and alerts will build on the summary data.
   - The goal is to warn users before they overspend, not only after the fact.

## How It Works

```text
Spend -> SMS received -> AI parses -> Expense logged -> Summary updated
```

The current app supports manual logging, Firebase persistence, Home Screen Quick Actions, and spending summaries. SMS parsing, shared budgets, and limit alerts are part of the planned feature roadmap.

## Tech Stack

- React Native
- Expo
- Firebase
- Firestore
- OpenAI API

## Run Locally

```bash
npm install
npx expo start
```

Home Screen Quick Actions are wired with `expo-quick-actions`, but they require a native development build or EAS build to test fully. Expo Go may not expose that native behavior.

If Expo hangs while starting, check your Node version. Expo SDK 54 works best on a Node LTS version such as Node 20 or 22.

## Milestone 1 POC Access

The Milestone 1 POC can be tested from this repository branch using Expo Go for the main app flow.

```bash
git clone https://github.com/GeraldFSE/SpendSnap.git
cd SpendSnap
git checkout feature/expense-logging
npm install
```

Create a `.env` file in the project root using the demo config below, then start the project:

```bash
npx expo start
```

Scan the QR code with Expo Go. Evaluators can test:

- Manual expense logging through the Add Expense tab.
- Category selection through the modal picker.
- Optional notes entry.
- Expense saving to the shared demo Firestore project.
- Real-time expense history on the Home tab.
- Spending summaries on the Summary tab.

Quick Actions are implemented in code using `expo-quick-actions`, but native app icon shortcuts require an EAS/development build. In Expo Go, evaluators should use the Add Expense tab to access the same expense logging flow.

## Milestone 1 Demo Firebase Config

This Firebase config is provided for Milestone 1 evaluator convenience only. It connects to a shared demo Firestore project, so please use test data only and do not enter real financial information.

Create `.env` in the project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDdBZDHiOsQshQrhYam0aXme-Vilwz9W4I
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=spendsnap-d8317.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=spendsnap-d8317
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=spendsnap-d8317.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=824207811936
EXPO_PUBLIC_FIREBASE_APP_ID=1:824207811936:web:9441cd5d5bc2396997ea05
EXPO_PUBLIC_OPENAI_API_KEY=
```

The OpenAI key is intentionally blank because SMS parsing is not part of the Milestone 1 POC.

## Project Structure

```text
src/
  components/
  navigation/
  screens/
  services/
App.js
```

## Firebase

Firestore is configured in `src/services/firebase.js` using Expo public environment variables. Add your Firebase web app config to `.env` before testing real persistence.

Expense documents are saved in the `expenses` collection with:

- `amount`: number
- `category`: string
- `notes`: string
- `date`: Firestore timestamp

## Roadmap

- Improve category selection and category-level analytics.
- Add SMS parsing flow with OpenAI-backed extraction.
- Add shared budget groups with member access.
- Add budget limits, alerts, and notification settings.
- Add authentication once shared budgets require user accounts.
