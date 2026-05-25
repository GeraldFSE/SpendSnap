import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { subscribeToExpenses } from "../services/firebase";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_HEIGHT = 148;

const PERIODS = [
  { key: "daily", label: "Daily", count: 7 },
  { key: "weekly", label: "Weekly", count: 6 },
  { key: "monthly", label: "Monthly", count: 6 }
];

const BAR_COLORS = ["#2563EB", "#0F766E", "#EA580C", "#7C3AED", "#C2410C", "#0891B2"];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const compactCurrencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

const dayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric"
});

const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric"
});

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short"
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatCompactCurrency(value) {
  const amount = Number(value) || 0;

  if (amount === 0) {
    return "$0";
  }

  return compactCurrencyFormatter.format(amount);
}

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

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function startOfWeek(date) {
  const nextDate = startOfDay(date);
  const dayOffset = (nextDate.getDay() + 6) % 7;
  nextDate.setDate(nextDate.getDate() - dayOffset);
  return nextDate;
}

function startOfMonth(date) {
  const nextDate = startOfDay(date);
  nextDate.setDate(1);
  return nextDate;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

function addMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function weekKey(date) {
  return dayKey(startOfWeek(date));
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function getRangeKey(date, period) {
  if (period === "weekly") {
    return weekKey(date);
  }

  if (period === "monthly") {
    return monthKey(date);
  }

  return dayKey(date);
}

function getPeriodStart(date, period) {
  if (period === "weekly") {
    return startOfWeek(date);
  }

  if (period === "monthly") {
    return startOfMonth(date);
  }

  return startOfDay(date);
}

function getPeriodLabel(date, period) {
  if (period === "weekly") {
    return dateLabelFormatter.format(date);
  }

  if (period === "monthly") {
    return monthLabelFormatter.format(date);
  }

  return dayLabelFormatter.format(date);
}

function buildRanges(period) {
  const count = PERIODS.find((item) => item.key === period)?.count ?? 6;
  const currentStart = getPeriodStart(new Date(), period);

  return Array.from({ length: count }, (_, index) => {
    const distanceFromCurrent = count - index - 1;
    let date = addDays(currentStart, -distanceFromCurrent);

    if (period === "weekly") {
      date = addWeeks(currentStart, -distanceFromCurrent);
    }

    if (period === "monthly") {
      date = addMonths(currentStart, -distanceFromCurrent);
    }

    return {
      key: getRangeKey(date, period),
      label: getPeriodLabel(date, period),
      total: 0
    };
  });
}

function summarizeExpenses(expenses, period) {
  const ranges = buildRanges(period);
  const totalsByKey = ranges.reduce((totals, range) => {
    totals[range.key] = 0;
    return totals;
  }, {});

  expenses.forEach((expense) => {
    const expenseDate = toExpenseDate(expense.date);
    const amount = Number(expense.amount);

    if (!expenseDate || Number.isNaN(amount)) {
      return;
    }

    const key = getRangeKey(expenseDate, period);

    if (Object.prototype.hasOwnProperty.call(totalsByKey, key)) {
      totalsByKey[key] += amount;
    }
  });

  const data = ranges.map((range) => ({
    ...range,
    total: totalsByKey[range.key]
  }));
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const maxValue = Math.max(...data.map((item) => item.total), 0);
  const activeTotal = data[data.length - 1]?.total ?? 0;
  const average = data.length > 0 ? total / data.length : 0;

  return {
    data,
    total,
    maxValue,
    activeTotal,
    average
  };
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

export default function SpendingSummaryScreen() {
  const [expenses, setExpenses] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToExpenses(
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
  }, []);

  const summary = useMemo(() => summarizeExpenses(expenses, selectedPeriod), [expenses, selectedPeriod]);
  const selectedPeriodLabel = PERIODS.find((period) => period.key === selectedPeriod)?.label ?? "Daily";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.mutedText}>Loading spending summary...</Text>
      </View>
    );
  }

  return (
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
  }
});
