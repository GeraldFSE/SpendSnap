import { initializeApp, getApps } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Reuse the Firebase app during Fast Refresh so Expo does not initialize twice.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
const expensesRef = collection(db, "expenses");
const monthlyBudgetRef = doc(db, "settings", "monthlyBudget");

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
        ...doc.data({ serverTimestamps: "estimate" })
      }));

      onExpenses(expenses);
    },
    onError
  );
}

export async function saveMonthlyBudget(amount) {
  return setDoc(
    monthlyBudgetRef,
    {
      amount: Number(amount),
      currency: "USD",
      period: "monthly",
      warningThreshold: 0.8,
      exceededThreshold: 1,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export function subscribeToMonthlyBudget(onBudget, onError) {
  return onSnapshot(
    monthlyBudgetRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onBudget(null);
        return;
      }

      onBudget({
        id: snapshot.id,
        ...snapshot.data()
      });
    },
    onError
  );
}
