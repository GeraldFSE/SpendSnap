import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatCurrency } from "../utils/currency";

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

export default function ExpenseItem({ expense, attribution, onDelete, onEdit, onLongPress }) {
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={450}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.details}>
        <Text style={styles.category}>{expense.category}</Text>
        <Text style={styles.date}>
          {formatDate(expense.date)}
          {attribution ? ` · ${attribution}` : ""}
        </Text>
        {expense.notes ? <Text style={styles.notes}>{expense.notes}</Text> : null}
      </View>

      <View style={styles.trailing}>
        <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => [styles.editButton, pressed ? styles.editButtonPressed : null]}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => [styles.deleteButton, pressed ? styles.deleteButtonPressed : null]}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
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
  cardPressed: {
    backgroundColor: "#F1F5F9"
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
  trailing: {
    alignItems: "flex-end",
    gap: 8
  },
  amount: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800"
  },
  editButton: {
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  editButtonPressed: {
    backgroundColor: "#BFDBFE"
  },
  editText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800"
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  deleteButtonPressed: {
    backgroundColor: "#FECACA"
  },
  deleteText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "800"
  }
});
