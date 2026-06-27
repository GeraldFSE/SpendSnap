import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { saveMonthlyBudget, subscribeToPersonalExpenses, subscribeToMonthlyBudget } from "../services/firebase";
import { formatCurrency, formatCompactCurrency } from "../utils/currency";
import { PERIODS, summarizeCurrentMonth, summarizeExpenses } from "../utils/expenses";
import { getBudgetState } from "../utils/budget";

const CHART_HEIGHT = 148;
const BAR_COLORS = ["#2563EB", "#0F766E", "#EA580C", "#7C3AED", "#C2410C", "#0891B2"];

function BudgetProgressCard({ budget, errorMessage, loading, monthlySpent, onEdit }) {
  const budgetState = getBudgetState(budget, monthlySpent);
  const progressPercent = `${budgetState.progress * 100}%`;

  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <View style={styles.budgetTitleGroup}>
          <Text style={styles.cardEyebrow}>Monthly budget</Text>
          <Text style={styles.budgetStatus} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {loading ? "Loading budget" : budgetState.status}
          </Text>
        </View>

        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.budgetAction, pressed ? styles.budgetActionPressed : null]}
        >
          <Text style={styles.budgetActionText}>{budgetState.hasBudget ? "Edit" : "Set"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.budgetLoadingRow}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.budgetMutedText}>Loading budget...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.budgetAmountLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {budgetState.hasBudget
              ? `${formatCurrency(monthlySpent)} of ${formatCurrency(budgetState.budgetAmount)}`
              : `${formatCurrency(monthlySpent)} spent this month`}
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: budgetState.color,
                  width: progressPercent
                }
              ]}
            />
          </View>

          <Text style={[styles.budgetDetail, { color: budgetState.color }]}>{budgetState.detail}</Text>
          {budgetState.hasBudget ? (
            <Text style={styles.budgetHint}>Alerts fire once per month at 80% and 100%.</Text>
          ) : null}
        </>
      )}

      {errorMessage ? <Text style={styles.budgetErrorText}>{errorMessage}</Text> : null}
    </View>
  );
}

function SpendingChart({ data, maxValue }) {
  return (
    <View style={styles.chart}>
      {data.map((item, index) => {
        const hasValue = item.total > 0;
        const height = hasValue ? Math.max((item.total / maxValue) * CHART_HEIGHT, 12) : 4;

        return (
          <View key={item.key} style={styles.barColumn}>
            <Text style={styles.barValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {formatCompactCurrency(item.total)}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: hasValue ? BAR_COLORS[index % BAR_COLORS.length] : "#CBD5E1",
                    height
                  }
                ]}
              />
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function SpendingSummaryScreen({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [budgetErrorMessage, setBudgetErrorMessage] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPersonalExpenses(
      user.uid,
      (items) => {
        setExpenses(items);
        setErrorMessage("");
        setLoading(false);
      },
      (error) => {
        console.warn("Unable to load spending summary.", error);
        setErrorMessage("Unable to load spending summary. Check your Firebase config.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToMonthlyBudget(
      user.uid,
      (item) => {
        setBudget(item);
        setBudgetErrorMessage("");
        setBudgetLoading(false);
      },
      (error) => {
        console.warn("Unable to load monthly budget.", error);
        setBudgetErrorMessage("Unable to load monthly budget.");
        setBudgetLoading(false);
      }
    );

    return unsubscribe;
  }, [user.uid]);

  const summary = useMemo(() => summarizeExpenses(expenses, selectedPeriod), [expenses, selectedPeriod]);
  const monthlySpent = useMemo(() => summarizeCurrentMonth(expenses), [expenses]);
  const selectedPeriodLabel = PERIODS.find((period) => period.key === selectedPeriod)?.label ?? "Daily";

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
      Alert.alert("Save failed", "Check your Firebase config and try again.");
    } finally {
      setSavingBudget(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.mutedText}>Loading spending summary...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.periodTabs}>
          {PERIODS.map((period) => {
            const selected = selectedPeriod === period.key;

            return (
              <Pressable
                key={period.key}
                onPress={() => setSelectedPeriod(period.key)}
                style={({ pressed }) => [
                  styles.periodTab,
                  selected ? styles.periodTabSelected : null,
                  pressed ? styles.periodTabPressed : null
                ]}
              >
                <Text style={[styles.periodTabText, selected ? styles.periodTabTextSelected : null]}>
                  {period.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <BudgetProgressCard
          budget={budget}
          errorMessage={budgetErrorMessage}
          loading={budgetLoading}
          monthlySpent={monthlySpent}
          onEdit={openBudgetModal}
        />

        <View style={styles.totalCard}>
          <Text style={styles.cardEyebrow}>{selectedPeriodLabel} total</Text>
          <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {formatCurrency(summary.total)}
          </Text>
          <Text style={styles.totalSubtext}>
            Current period {formatCurrency(summary.activeTotal)} - average {formatCurrency(summary.average)}
          </Text>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Spending trend</Text>
              <Text style={styles.chartSubtitle}>
                Last {summary.data.length} {selectedPeriod === "daily" ? "days" : selectedPeriod === "weekly" ? "weeks" : "months"}
              </Text>
            </View>
            <Text style={styles.chartPeak} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              Peak {formatCurrency(summary.maxValue)}
            </Text>
          </View>

          {summary.total > 0 ? (
            <SpendingChart data={summary.data} maxValue={summary.maxValue} />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyTitle}>No spending yet</Text>
              <Text style={styles.mutedText}>Log expenses to see totals here.</Text>
            </View>
          )}
        </View>
      </ScrollView>

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
  content: {
    padding: 16,
    gap: 14
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
    fontSize: 15,
    textAlign: "center"
  },
  errorText: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    padding: 12
  },
  periodTabs: {
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  periodTab: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    paddingVertical: 10
  },
  periodTabPressed: {
    backgroundColor: "#DBEAFE"
  },
  periodTabSelected: {
    backgroundColor: "#FFFFFF"
  },
  periodTabText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "800"
  },
  periodTabTextSelected: {
    color: "#1D4ED8"
  },
  budgetCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  budgetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  budgetTitleGroup: {
    flex: 1,
    minWidth: 0
  },
  budgetStatus: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4
  },
  budgetAction: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  budgetActionPressed: {
    backgroundColor: "#DBEAFE"
  },
  budgetActionText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "800"
  },
  budgetLoadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },
  budgetMutedText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600"
  },
  budgetAmountLine: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 18
  },
  progressTrack: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    height: 12,
    marginTop: 14,
    overflow: "hidden",
    width: "100%"
  },
  progressFill: {
    borderRadius: 999,
    height: "100%"
  },
  budgetDetail: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10
  },
  budgetHint: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6
  },
  budgetErrorText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10
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
    fontSize: 36,
    fontWeight: "900",
    marginTop: 6
  },
  totalSubtext: {
    color: "#475569",
    fontSize: 14,
    marginTop: 4
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  chartHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16
  },
  chartTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "900"
  },
  chartSubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 2
  },
  chartPeak: {
    color: "#0F766E",
    flexShrink: 0,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3
  },
  chart: {
    flexDirection: "row",
    gap: 8,
    minHeight: 214
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    minWidth: 0
  },
  barValue: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
    height: 18,
    textAlign: "center",
    width: "100%"
  },
  barTrack: {
    alignItems: "center",
    borderBottomColor: "#CBD5E1",
    borderBottomWidth: 1,
    height: CHART_HEIGHT,
    justifyContent: "flex-end",
    width: "100%"
  },
  bar: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    width: "68%"
  },
  barLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
    width: "100%"
  },
  emptyChart: {
    alignItems: "center",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    minHeight: 214,
    justifyContent: "center",
    padding: 24
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6
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
