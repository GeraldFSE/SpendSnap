import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import ExpenseItem from "../components/ExpenseItem";
import { subscribeToMonthlyBudget, subscribeToPersonalExpenses } from "../services/firebase";
import { formatCurrency } from "../utils/currency";

function toExpenseDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1000000));
  }

  return null;
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function startOfMonth(date) {
  const nextDate = startOfDay(date);
  nextDate.setDate(1);
  return nextDate;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function sumExpensesInRange(expenses, start, end) {
  return expenses.reduce((total, expense) => {
    const expenseDate = toExpenseDate(expense.date);
    const amount = Number(expense.amount);

    if (!expenseDate || Number.isNaN(amount) || expenseDate < start || expenseDate >= end) {
      return total;
    }

    return total + amount;
  }, 0);
}

export default function HomeScreen({ onSignOut, user }) {
  const navigation = useNavigation();
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Home is a personal feed of the signed-in user's own expenses, regardless of any
    // groups they belong to.
    const unsubscribe = subscribeToPersonalExpenses(
      user.uid,
      (items) => {
        setExpenses(items);
        setErrorMessage("");
        setLoading(false);
      },
      (error) => {
        console.warn("Unable to load expenses.", error);
        setErrorMessage("Unable to load expenses. Check your Firebase config.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToMonthlyBudget(
      user.uid,
      (item) => setBudget(item),
      (error) => console.warn("Unable to load monthly budget.", error)
    );

    return unsubscribe;
  }, [user.uid]);

  const dashboard = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const todayTotal = sumExpensesInRange(expenses, todayStart, addDays(todayStart, 1));
    const monthTotal = sumExpensesInRange(expenses, monthStart, addMonths(monthStart, 1));
    const budgetAmount = Number(budget?.amount) || 0;
    const budgetRatio = budgetAmount > 0 ? monthTotal / budgetAmount : 0;
    const budgetProgress = Math.min(budgetRatio, 1);
    const budgetColor = budgetRatio >= 1 ? "#DC2626" : budgetRatio >= 0.8 ? "#D97706" : "#16A34A";
    const recentExpenses = expenses.slice(0, 3);

    return {
      budgetAmount,
      budgetColor,
      budgetProgress,
      budgetRatio,
      monthTotal,
      recentExpenses,
      todayTotal
    };
  }, [budget, expenses]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.mutedText}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={dashboard.recentExpenses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ExpenseItem expense={item} />}
      ListHeaderComponent={
        <View style={styles.headerContent}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.accountBar}>
            <View style={styles.accountCopy}>
              <Text style={styles.greeting}>Today</Text>
              <Text style={styles.accountValue} numberOfLines={1}>
                {user.isAnonymous ? "Guest account" : user.email}
              </Text>
            </View>
            <Pressable
              onPress={onSignOut}
              style={({ pressed }) => [styles.signOutButton, pressed ? styles.signOutButtonPressed : null]}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>

          <View style={styles.monthCard}>
            <Text style={styles.sectionLabel}>This month</Text>
            <Text style={styles.monthAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatCurrency(dashboard.monthTotal)}
            </Text>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetText}>
                {dashboard.budgetAmount > 0
                  ? `${Math.round(dashboard.budgetRatio * 100)}% of ${formatCurrency(dashboard.budgetAmount)}`
                  : "No monthly budget set"}
              </Text>
              <Text style={[styles.budgetStatus, { color: dashboard.budgetColor }]}>
                {dashboard.budgetRatio >= 1 ? "Exceeded" : dashboard.budgetRatio >= 0.8 ? "Near limit" : "On track"}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: dashboard.budgetColor,
                    width: `${dashboard.budgetProgress * 100}%`
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Today spent</Text>
              <Text style={styles.metricValue}>{formatCurrency(dashboard.todayTotal)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Transactions</Text>
              <Text style={styles.metricValue}>{expenses.length}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => navigation.navigate("Add Expense")}
              style={({ pressed }) => [styles.actionButton, pressed ? styles.actionButtonPressed : null]}
            >
              <Ionicons name="add-circle" size={22} color="#2563EB" />
              <Text style={styles.actionText}>Add</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("History")}
              style={({ pressed }) => [styles.actionButton, pressed ? styles.actionButtonPressed : null]}
            >
              <Ionicons name="time" size={21} color="#2563EB" />
              <Text style={styles.actionText}>History</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Summary")}
              style={({ pressed }) => [styles.actionButton, pressed ? styles.actionButtonPressed : null]}
            >
              <Ionicons name="stats-chart" size={20} color="#2563EB" />
              <Text style={styles.actionText}>Summary</Text>
            </Pressable>
          </View>

          <Text style={styles.recentLabel}>Recent expenses</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No recent expenses</Text>
          <Text style={styles.mutedText}>Add an expense to start tracking your month.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  list: {
    padding: 16,
    gap: 10
  },
  headerContent: {
    gap: 12
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8
  },
  mutedText: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "center"
  },
  emptyState: {
    alignItems: "center",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: 4,
    padding: 24
  },
  errorText: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    marginTop: 16,
    padding: 12
  },
  accountBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 2
  },
  accountCopy: {
    flex: 1,
    minWidth: 0
  },
  greeting: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "700"
  },
  accountValue: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 3
  },
  signOutButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  signOutButtonPressed: {
    backgroundColor: "#E2E8F0"
  },
  signOutText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700"
  },
  monthCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  sectionLabel: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700"
  },
  monthAmount: {
    color: "#0F172A",
    fontSize: 34,
    fontWeight: "700",
    marginTop: 6
  },
  budgetRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  budgetText: {
    color: "#475569",
    flex: 1,
    fontSize: 14,
    paddingRight: 10
  },
  budgetStatus: {
    fontSize: 14,
    fontWeight: "700"
  },
  progressTrack: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    height: 10,
    marginTop: 12,
    overflow: "hidden"
  },
  progressFill: {
    borderRadius: 999,
    height: "100%"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600"
  },
  metricValue: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "700",
    marginTop: 6
  },
  actionRow: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    flex: 1,
    gap: 5,
    paddingVertical: 12
  },
  actionButtonPressed: {
    backgroundColor: "#DBEAFE"
  },
  actionText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "700"
  },
  recentLabel: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4
  }
});
