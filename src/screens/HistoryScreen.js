import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import ExpenseItem from "../components/ExpenseItem";
import { subscribeToExpenses } from "../services/firebase";

const CATEGORY_COLORS = ["#2563EB", "#0F766E", "#EA580C", "#7C3AED", "#C2410C", "#0891B2"];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function summarizeByCategory(expenses) {
  const totals = new Map();

  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    const category = expense.category || "Others";
    totals.set(category, (totals.get(category) ?? 0) + amount);
  });

  const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? amount / total : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

export default function HistoryScreen({ user, groupId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const sharedGroup = Boolean(groupId) && groupId !== user.uid;

  useEffect(() => {
    const unsubscribe = subscribeToExpenses(
      groupId,
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
  }, [groupId]);

  const categoryBreakdown = useMemo(() => summarizeByCategory(expenses), [expenses]);
  const total = useMemo(() => expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [expenses]);

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
      data={expenses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ExpenseItem
          expense={item}
          attribution={sharedGroup ? (item.userId === user.uid ? "You" : `Member ${item.userId?.slice(0, 6)}`) : null}
        />
      )}
      ListHeaderComponent={
        <View style={styles.headerSection}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.totalCard}>
            <Text style={styles.cardEyebrow}>{sharedGroup ? "Group total" : "Total spent"}</Text>
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