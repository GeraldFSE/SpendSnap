# SpendSnap

SpendSnap is an Expo managed React Native app for quick expense logging and Firestore-backed budget history.

## Run Locally

```bash
npm install
npx expo start
```

Home Screen Quick Actions are wired with `expo-quick-actions`, but they require a native development build or EAS build to test fully. Expo Go may not expose that native behavior.

## Structure

```text
src/
  screens/
  components/
  services/
  navigation/
App.js
```

## Firebase

Firestore is configured in `src/services/firebase.js` with placeholder values. Replace the placeholders with your Firebase web app config before testing real persistence.

Expense documents are saved in the `expenses` collection with:

- `amount`: number
- `category`: string
- `notes`: string
- `date`: Firestore timestamp

## Future Files

`HistoryScreen.js`, `LoginScreen.js`, `GroupScreen.js`, `CategoryPicker.js`, and `openai.js` are intentionally empty placeholders for future features.
