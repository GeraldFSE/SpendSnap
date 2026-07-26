import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, firebaseApp } from "./firebase";
import { formatLocalDate, normalizeQuickLogResult } from "../utils/quickLog";

const functions = getFunctions(firebaseApp, "asia-southeast1");
const callParseExpenseText = httpsCallable(functions, "parseExpenseText", {
  timeout: 25000
});

export async function parseExpenseText(description) {
  const text = description?.trim();

  if (!text) {
    throw new Error("Enter an expense description.");
  }

  if (text.length > 500) {
    throw new Error("Keep the description under 500 characters.");
  }

  if (!auth.currentUser) {
    throw new Error("Sign in before using Quick Log.");
  }

  const response = await callParseExpenseText({
    text,
    today: formatLocalDate()
  });
  return normalizeQuickLogResult(response.data);
}
