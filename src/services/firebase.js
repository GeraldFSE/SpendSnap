import { initializeApp, getApps } from "firebase/app";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Reuse the Firebase app during Fast Refresh so Expo does not initialize twice.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
const expensesRef = collection(db, "expenses");

export async function saveExpense({ amount, category, notes }) {
  return addDoc(expensesRef, {
    amount: Number(amount),
    category,
    notes: notes?.trim() ?? "",
    date: serverTimestamp()
  });
}

export function subscribeToExpenses(onExpenses, onError) {
  // Real-time listener keeps the Home screen in sync with Firestore changes.
  const expensesQuery = query(expensesRef, orderBy("date", "desc"));

  return onSnapshot(
    expensesQuery,
    (snapshot) => {
      const expenses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      onExpenses(expenses);
    },
    onError
  );
}
