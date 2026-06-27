import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import ExpenseItem from "../components/ExpenseItem";
import { saveMonthlyBudget, subscribeToMonthlyBudget, subscribeToPersonalExpenses } from "../services/firebase";
import { formatCurrency } from "../utils/currency";
import { addDays, addMonths, startOfDay, startOfMonth } from "../utils/dates";
import { sumExpensesInRange } from "../utils/expenses";

export default function HomeScreen({ onSignOut, user }) {
  const navigation = useNavigation();
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

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

  function openBudgetModal() {
    const currentAmount = Number(budget?.amount);
    setBudgetInput(currentAmount > 0 ? String(currentAmount) : "");
    setBudgetModalVisible(true);
  }

  async function handleSaveBudget() {
    const parsedAmount = Number(budgetInput);

    if (!budgetInput.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid budget", "Enter a monthly budget greater than 0.");
      return;
    }

    try {
      setSavingBudget(true);
      await saveMonthlyBudget(user.uid, parsedAmount);
      setBudgetModalVisible(false);
    } catch (error) {
      console.warn("Unable to save monthly budget.", error);
      Alert.alert("Save failed", "Check your connection and try again.");
    } finally {
      setSavingBudget(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.mutedText}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <>
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
              {dashboard.budgetAmount > 0 ? (
                <View style={styles.budgetStatusRow}>
                  <Text style={[styles.budgetStatus, { color: dashboard.budgetColor }]}>
                    {dashboard.budgetRatio >= 1 ? "Exceeded" : dashboard.budgetRatio >= 0.8 ? "Near limit" : "On track"}
                  </Text>
                  <Pressable
                    onPress={openBudgetModal}
                    style={({ pressed }) => [styles.editBudgetButton, pressed ? styles.editBudgetButtonPressed : null]}
                  >
                    <Text style={styles.editBudgetText}>Edit</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={openBudgetModal}
                  style={({ pressed }) => [styles.setBudgetButton, pressed ? styles.setBudgetButtonPressed : null]}
                >
                  <Text style={styles.setBudgetText}>Set budget</Text>
                </Pressable>
              )}
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
            {dashboard.budgetAmount > 0 ? (
              <Text style={styles.budgetHint}>Alerts fire once per month at 80% and 100%.</Text>
            ) : null}
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

    <Modal
      animationType="fade"
      transparent
      visible={budgetModalVisible}
      onRequestClose={() => setBudgetModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: "height" })}
        style={styles.modalKeyboardView}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBudgetModalVisible(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Monthly budget</Text>
            <Text style={styles.modalLabel}>Budget amount</Text>
            <TextInput
              value={budgetInput}
              onChangeText={setBudgetInput}
              placeholder="0.00"
              keyboardType="decimal-pad"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setBudgetModalVisible(false)}
                disabled={savingBudget}
                style={({ pressed }) => [styles.modalSecondaryButton, pressed ? styles.modalButtonPressed : null]}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveBudget}
                disabled={savingBudget}
                style={({ pressed }) => [
                  styles.modalPrimaryButton,
                  pressed && !savingBudget ? styles.modalPrimaryButtonPressed : null,
                  savingBudget ? styles.modalButtonDisabled : null
                ]}
              >
                {savingBudget ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
    </>
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
  setBudgetButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  setBudgetButtonPressed: {
    backgroundColor: "#1D4ED8"
  },
  setBudgetText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  budgetStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  editBudgetButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  editBudgetButtonPressed: {
    backgroundColor: "#DBEAFE"
  },
  editBudgetText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "800"
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
  budgetHint: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8
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
  },
  modalKeyboardView: {
    flex: 1
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 16
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900"
  },
  modalLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 18
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },
  modalSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 14
  },
  modalButtonPressed: {
    backgroundColor: "#E2E8F0"
  },
  modalSecondaryText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800"
  },
  modalPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 14
  },
  modalPrimaryButtonPressed: {
    backgroundColor: "#1D4ED8"
  },
  modalButtonDisabled: {
    opacity: 0.7
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  }
});
