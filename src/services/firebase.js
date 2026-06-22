import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
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

function initializeFirebaseAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    if (error?.code !== "auth/already-initialized") {
      throw error;
    }

    return getAuth(app);
  }
}

function requireUserId(userId) {
  if (!userId) {
    throw new Error("A Firebase user ID is required.");
  }
}

export const db = getFirestore(app);
export const auth = initializeFirebaseAuth();

function getExpensesRef(userId) {
  requireUserId(userId);
  return collection(db, "users", userId, "expenses");
}

function getMonthlyBudgetRef(userId) {
  requireUserId(userId);
  return doc(db, "users", userId, "settings", "monthlyBudget");
}

export function subscribeToAuthState(onUser, onError) {
  return onAuthStateChanged(auth, onUser, onError);
}

export async function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInAsGuest() {
  return signInAnonymously(auth);
}

export async function signOutUser() {
  return signOut(auth);
}

export async function saveExpense(userId, { amount, category, notes, groupId }) {
  return addDoc(getExpensesRef(userId), {
    amount: Number(amount),
    category,
    notes: notes?.trim() ?? "",
    date: serverTimestamp(),
    userId,
    // Solo users default to their own uid, which behaves like a personal group of one.
    groupId: groupId ?? userId
  });
}

export function subscribeToExpenses(groupId, onExpenses, onError) {
  // Collection-group query spans every member's "expenses" subcollection so shared
  // groups sync in real time, while solo users just see their own groupId-of-one.
  const expensesQuery = query(
    collectionGroup(db, "expenses"),
    where("groupId", "==", groupId),
    orderBy("date", "desc")
  );

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

export async function saveMonthlyBudget(userId, amount) {
  return setDoc(
    getMonthlyBudgetRef(userId),
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

export function subscribeToMonthlyBudget(userId, onBudget, onError) {
  return onSnapshot(
    getMonthlyBudgetRef(userId),
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
