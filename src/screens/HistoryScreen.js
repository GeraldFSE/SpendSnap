import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import ExpenseItem from "../components/ExpenseItem";
import { deleteExpense, subscribeToPersonalExpenses } from "../services/firebase";
import { formatCurrency } from "../utils/currency";
import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek, toExpenseDate } from "../utils/dates";
import { summarizeByCategory } from "../utils/expenses";

const CATEGORY_COLORS = ["#2563EB", "#0F766E", "#EA580C", "#7C3AED", "#C2410C", "#0891B2"];
const FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" }
];

function getFilterRange(filter) {
  const now = new Date();

  if (filter === "today") {
    const start = startOfDay(now);
    return { start, end: addDays(start, 1) };
  }

  if (filter === "week") {
    const start = startOfWeek(now);
    return { start, end: addDays(start, 7) };
  }

  if (filter === "month") {
    const start = startOfMonth(now);
    return { start, end: addMonths(start, 1) };
  }

  return { start: null, end: null };
}

function filterExpenses(expenses, filter) {
  const { start, end } = getFilterRange(filter);

  if (!start || !end) {
    return expenses;
  }

  return expenses.filter((expense) => {
    const expenseDate = toExpenseDate(expense.date);
    return expenseDate && expenseDate >= start && expenseDate < end;
  });
}

export default function HistoryScreen({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("month");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToPersonalExpenses(
      user.uid,
      (items) => {
        setExpenses(items);
        setErrorMessage("");
        setLoading(false);
      },
      (error) => {
        console.warn("Unable to load expense history.", error);
        setErrorMessage("Unable to load expense history.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user.uid]);

  const filteredExpenses = useMemo(() => filterExpenses(expenses, selectedFilter), [expenses, selectedFilter]);
  const categoryBreakdown = useMemo(() => summarizeByCategory(filteredExpenses), [filteredExpenses]);
  const total = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [filteredExpenses]
  );

  function confirmDeleteExpense(expense) {
    Alert.alert(
      "Delete expense?",
      `This will permanently delete ${formatCurrency(expense.amount)} from your history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense(user.uid, expense.id);
            } catch (error) {
              console.warn("Unable to delete expense.", error);
              Alert.alert("Delete failed", "Check your connection and try again.");
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.mutedText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={filteredExpenses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ExpenseItem
          expense={item}
          onDelete={() => confirmDeleteExpense(item)}
          onLongPress={() => confirmDeleteExpense(item)}
        />
      )}
      ListHeaderComponent={
        <View style={styles.headerSection}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.filterTabs}>
            {FILTERS.map((filter) => {
              const selected = selectedFilter === filter.key;

              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setSelectedFilter(filter.key)}
                  style={({ pressed }) => [
                    styles.filterTab,
                    selected ? styles.filterTabSelected : null,
                    pressed ? styles.filterTabPressed : null
                  ]}
                >
                  <Text style={[styles.filterTabText, selected ? styles.filterTabTextSelected : null]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.cardEyebrow}>Total spent</Text>
            <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatCurrency(total)}
            </Text>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.cardEyebrow}>By category</Text>

            {categoryBreakdown.length === 0 ? (
              <Text style={styles.mutedText}>No expenses yet.</Text>
            ) : (
              categoryBreakdown.map((item, index) => (
                <View key={item.category} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <Text style={styles.breakdownCategory}>{item.category}</Text>
                    <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                  <View style={styles.breakdownTrack}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${Math.max(item.percent * 100, 3)}%`,
                          backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                        }
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </View>

          <Text style={styles.historyLabel}>History</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No expenses yet</Text>
          <Text style={styles.mutedText}>Logged expenses will show up here.</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 24
  },
  mutedText: {
    color: "#64748B",
    fontSize: 14
  },
  errorText: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    fontWeight: "700",
    marginBottom: 14,
    padding: 12
  },
  headerSection: {
    gap: 14,
    marginBottom: 10
  },
  filterTabs: {
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  filterTab: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    paddingVertical: 10
  },
  filterTabPressed: {
    backgroundColor: "#DBEAFE"
  },
  filterTabSelected: {
    backgroundColor: "#FFFFFF"
  },
  filterTabText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800"
  },
  filterTabTextSelected: {
    color: "#1D4ED8"
  },
  totalCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  cardEyebrow: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  totalAmount: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 6
  },
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  breakdownRow: {
    marginTop: 12
  },
  breakdownLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  breakdownCategory: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700"
  },
  breakdownAmount: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700"
  },
  breakdownTrack: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    overflow: "hidden"
  },
  breakdownFill: {
    borderRadius: 999,
    height: "100%"
  },
  historyLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase"
  },
  emptyState: {
    alignItems: "center",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: 24
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6
  }
});
