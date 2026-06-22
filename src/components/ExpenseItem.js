import React from "react";
import { StyleSheet, Text, View } from "react-native";

function formatDate(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : null;

  if (!date) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export default function ExpenseItem({ expense, attribution }) {
  return (
    <View style={styles.card}>
      <View style={styles.details}>
        <Text style={styles.category}>{expense.category}</Text>
        <Text style={styles.date}>
          {formatDate(expense.date)}
          {attribution ? ` · ${attribution}` : ""}
        </Text>
        {expense.notes ? <Text style={styles.notes}>{expense.notes}</Text> : null}
      </View>

      <Text style={styles.amount}>${Number(expense.amount ?? 0).toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14
  },
  details: {
    flex: 1,
    paddingRight: 12
  },
  category: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700"
  },
  date: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 2
  },
  notes: {
    color: "#475569",
    fontSize: 14,
    marginTop: 8
  },
  amount: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800"
  }
});
