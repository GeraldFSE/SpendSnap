import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { formatCurrency } from "../utils/currency";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

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

function getUserGroupsSettingsRef(userId) {
  requireUserId(userId);
  return doc(db, "users", userId, "settings", "groups");
}

function getGroupRef(groupId) {
  if (!groupId) {
    throw new Error("A group ID is required.");
  }

  return doc(db, "groups", groupId);
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

export async function saveExpense(userId, { amount, category, notes, groupIds }) {
  const savedExpense = await addDoc(getExpensesRef(userId), {
    amount: Number(amount),
    category,
    notes: notes?.trim() ?? "",
    date: serverTimestamp(),
    userId,
    // An expense belongs to its author and is mirrored into every group they're in,
    // so group members see each other's spending. Empty when the user is solo.
    groupIds: Array.isArray(groupIds) ? groupIds : []
  });

  try {
    await checkBudgetAndNotify(userId);
  } catch (error) {
    console.warn("Unable to check budget alerts.", error);
  }

  return savedExpense;
}

export async function deleteExpense(userId, expenseId) {
  requireUserId(userId);

  if (!expenseId) {
    throw new Error("An expense ID is required.");
  }

  return deleteDoc(doc(db, "users", userId, "expenses", expenseId));
}

function mapExpenses(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data({ serverTimestamps: "estimate" })
  }));
}

export function subscribeToPersonalExpenses(userId, onExpenses, onError) {
  // Home, Summary and History show the caller's own expenses only -- never affected by
  // creating, joining or leaving a group.
  const personalQuery = query(getExpensesRef(userId), orderBy("date", "desc"));

  return onSnapshot(personalQuery, (snapshot) => onExpenses(mapExpenses(snapshot)), onError);
}

export function subscribeToGroupExpenses(groupId, onExpenses, onError) {
  // Collection-group query spans every member's "expenses" subcollection, surfacing all
  // spending mirrored into this group (each member's docs carry the group id in groupIds).
  const groupQuery = query(
    collectionGroup(db, "expenses"),
    where("groupIds", "array-contains", groupId),
    orderBy("date", "desc")
  );

  return onSnapshot(groupQuery, (snapshot) => onExpenses(mapExpenses(snapshot)), onError);
}

export async function saveMonthlyBudget(userId, amount) {
  return setDoc(
    getMonthlyBudgetRef(userId),
    {
      amount: Number(amount),
      currency: "SGD",
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

function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function getCurrentMonthRange() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}

async function requestNotificationPermission() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("budget-alerts", {
      name: "Budget alerts",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const existing = await Notifications.getPermissionsAsync();

  if (existing.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function checkBudgetAndNotify(userId) {
  requireUserId(userId);

  const budgetRef = getMonthlyBudgetRef(userId);
  const budgetSnapshot = await getDoc(budgetRef);

  if (!budgetSnapshot.exists()) {
    return;
  }

  const budget = budgetSnapshot.data();
  const budgetAmount = Number(budget.amount) || 0;

  if (budgetAmount <= 0) {
    return;
  }

  const { start, end } = getCurrentMonthRange();
  const monthKey = getCurrentMonthKey(start);
  const expensesQuery = query(getExpensesRef(userId), where("date", ">=", start), where("date", "<", end));
  const expensesSnapshot = await getDocs(expensesQuery);
  const monthlyTotal = expensesSnapshot.docs.reduce((sum, document) => {
    return sum + (Number(document.data().amount) || 0);
  }, 0);

  const ratio = monthlyTotal / budgetAmount;
  const alertMonth = budget.alertMonth === monthKey ? budget.alertMonth : monthKey;
  const alerted80 = budget.alertMonth === monthKey ? Boolean(budget.alerted80) : false;
  const alerted100 = budget.alertMonth === monthKey ? Boolean(budget.alerted100) : false;
  let nextAlerted80 = alerted80;
  let nextAlerted100 = alerted100;
  let notification = null;

  if (ratio >= 1 && !alerted100) {
    nextAlerted80 = true;
    nextAlerted100 = true;
    notification = {
      title: "Budget exceeded",
      body: `You've spent ${formatCurrency(monthlyTotal)} of your ${formatCurrency(budgetAmount)} monthly budget.`
    };
  } else if (ratio >= 0.8 && !alerted80) {
    nextAlerted80 = true;
    notification = {
      title: "Budget warning",
      body: `You've used ${Math.round(ratio * 100)}% of your ${formatCurrency(budgetAmount)} monthly budget.`
    };
  }

  await setDoc(
    budgetRef,
    {
      alertMonth,
      alerted80: nextAlerted80,
      alerted100: nextAlerted100,
      lastCheckedAt: serverTimestamp()
    },
    { merge: true }
  );

  if (!notification) {
    return;
  }

  const granted = await requestNotificationPermission();

  if (!granted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: notification,
    trigger: null
  });
}

export function subscribeToUserGroups(userId, onGroupIds, onError) {
  // The list of groups a user belongs to; empty until they create or join one.
  return onSnapshot(
    getUserGroupsSettingsRef(userId),
    (snapshot) => {
      const ids = snapshot.exists() ? snapshot.data().ids : null;
      onGroupIds(Array.isArray(ids) ? ids : []);
    },
    onError
  );
}

export function subscribeToGroup(groupId, onGroup, onError) {
  return onSnapshot(
    getGroupRef(groupId),
    (snapshot) => {
      onGroup(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

// Mirror a membership change across every one of the user's existing expenses so the
// group sees their full history (on join) and stops seeing it (on leave). Batched in
// chunks to stay under Firestore's 500-write limit.
async function retagExpenseGroup(userId, groupId, operation) {
  const snapshot = await getDocs(getExpensesRef(userId));

  for (let index = 0; index < snapshot.docs.length; index += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(index, index + 450).forEach((document) => {
      batch.update(document.ref, { groupIds: operation });
    });
    await batch.commit();
  }
}

export async function createGroup(userId, name) {
  requireUserId(userId);
  const groupRef = doc(collection(db, "groups"));

  await setDoc(groupRef, {
    name: name?.trim() || "Shared budget",
    ownerId: userId,
    members: { [userId]: true },
    createdAt: serverTimestamp()
  });

  await setDoc(getUserGroupsSettingsRef(userId), { ids: arrayUnion(groupRef.id) }, { merge: true });
  await retagExpenseGroup(userId, groupRef.id, arrayUnion(groupRef.id));

  return groupRef.id;
}

export async function joinGroup(userId, groupId) {
  requireUserId(userId);
  const trimmedGroupId = groupId?.trim();

  if (!trimmedGroupId) {
    throw new Error("Enter a group code to join.");
  }

  // A merge-set against an existing group only adds the caller's own membership key,
  // which the security rules verify; an unknown/typo'd code fails validation instead
  // of silently creating a bogus group.
  await setDoc(getGroupRef(trimmedGroupId), { members: { [userId]: true } }, { merge: true });
  await setDoc(getUserGroupsSettingsRef(userId), { ids: arrayUnion(trimmedGroupId) }, { merge: true });
  await retagExpenseGroup(userId, trimmedGroupId, arrayUnion(trimmedGroupId));

  return trimmedGroupId;
}

export async function leaveGroup(userId, groupId) {
  requireUserId(userId);

  if (!groupId) {
    return;
  }

  await updateDoc(getGroupRef(groupId), { [`members.${userId}`]: deleteField() });
  await setDoc(getUserGroupsSettingsRef(userId), { ids: arrayRemove(groupId) }, { merge: true });
  await retagExpenseGroup(userId, groupId, arrayRemove(groupId));
}
