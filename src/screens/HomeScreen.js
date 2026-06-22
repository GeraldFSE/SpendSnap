import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import ExpenseItem from "../components/ExpenseItem";
import { subscribeToExpenses } from "../services/firebase";

export default function HomeScreen({ onSignOut, user, groupId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // groupId defaults to the user's own uid until they join/create a shared budget,
    // so this stays a personal feed for solo users and a shared one for group members.
    const unsubscribe = subscribeToExpenses(
      groupId,
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
  }, [groupId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.mutedText}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ExpenseItem expense={item} />}
        ListHeaderComponent={
          <View style={styles.accountBar}>
            <View style={styles.accountCopy}>
              <Text style={styles.accountLabel}>Signed in</Text>
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
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.mutedText}>Use Add Expense or the app icon quick action to log one.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16
  },
  list: {
    paddingVertical: 16,
    gap: 10
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
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14
  },
  accountCopy: {
    flex: 1,
    minWidth: 0
  },
  accountLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  accountValue: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2
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
    fontWeight: "800"
  }
});
