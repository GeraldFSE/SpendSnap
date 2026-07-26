import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { saveExpense, subscribeToGroup } from "../services/firebase";
import { parseExpenseText } from "../services/openai";
import { formatLocalDate, parseLocalDate, QUICK_LOG_CATEGORIES } from "../utils/quickLog";

const CATEGORIES = QUICK_LOG_CATEGORIES;

export default function AddExpenseScreen({ user, groupIds }) {
  const [quickLogText, setQuickLogText] = useState("");
  const [parsingQuickLog, setParsingQuickLog] = useState(false);
  const [quickLogMessage, setQuickLogMessage] = useState("");
  const [parsedType, setParsedType] = useState(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => formatLocalDate());
  const [groupsById, setGroupsById] = useState({});
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const groupIdList = useMemo(() => (Array.isArray(groupIds) ? groupIds : []), [groupIds]);
  const activeGroups = useMemo(
    () => groupIdList.map((groupId) => groupsById[groupId]).filter((group) => group && !group.archived),
    [groupIdList, groupsById]
  );
  const activeGroupIds = useMemo(() => activeGroups.map((group) => group.id), [activeGroups]);

  useEffect(() => {
    setGroupsById((current) => {
      const next = {};
      groupIdList.forEach((groupId) => {
        if (current[groupId]) {
          next[groupId] = current[groupId];
        }
      });
      return next;
    });

    if (groupIdList.length === 0) {
      return undefined;
    }

    const unsubscribers = groupIdList.map((groupId) =>
      subscribeToGroup(
        groupId,
        (group) => {
          setGroupsById((current) => {
            const next = { ...current };

            if (!group || group.archived) {
              delete next[groupId];
              return next;
            }

            next[groupId] = group;
            return next;
          });
        },
        (error) => console.warn("Unable to load group destination.", error)
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [groupIdList]);

  useEffect(() => {
    setSelectedGroupIds((current) => current.filter((groupId) => activeGroupIds.includes(groupId)));
  }, [activeGroupIds]);

  function toggleGroupSelection(groupId) {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((item) => item !== groupId) : [...current, groupId]
    );
  }

  async function handleQuickLog() {
    const text = quickLogText.trim();

    if (!text) {
      setQuickLogMessage("Describe a purchase first, or use the manual fields below.");
      return;
    }

    try {
      setParsingQuickLog(true);
      setQuickLogMessage("");
      setParsedType(null);

      const result = await parseExpenseText(text);
      const appliedFields = [];

      if (result.amount !== null) {
        appliedFields.push("amount");
      }

      if (result.category) {
        appliedFields.push("category");
      }

      if (result.merchant) {
        appliedFields.push("merchant");
      }

      if (result.date) {
        appliedFields.push("date");
      }

      setAmount(result.amount !== null ? String(result.amount) : "");
      setCategory(result.category ?? "");
      setNotes(result.merchant ?? "");
      setTransactionDate(result.date ?? "");
      setParsedType(result.type);

      if (result.type === "income") {
        setQuickLogMessage(
          "This looks like income. SpendSnap currently saves expenses only, so review it without submitting as spending."
        );
      } else if (result.message) {
        setQuickLogMessage(result.message);
      } else if (appliedFields.length > 0) {
        setQuickLogMessage(`Filled ${appliedFields.join(", ")}. Review everything before saving.`);
      } else {
        setQuickLogMessage("I couldn't confidently extract details. Continue with the manual fields below.");
      }
    } catch (error) {
      console.warn("Unable to parse Quick Log text.", error);
      setParsedType(null);
      setQuickLogMessage("Quick Log is unavailable right now. You can still enter the expense manually below.");
    } finally {
      setParsingQuickLog(false);
    }
  }

  async function handleSubmit() {
    const parsedAmount = Number(amount);
    const parsedDate = parseLocalDate(transactionDate);

    if (parsedType === "income") {
      Alert.alert(
        "Income detected",
        "SpendSnap currently tracks expenses only. Edit the amount to continue as a manual expense."
      );
      return;
    }

    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid expense amount.");
      return;
    }

    if (!CATEGORIES.includes(category)) {
      Alert.alert("Category required", "Choose an expense category.");
      return;
    }

    if (!parsedDate) {
      Alert.alert("Invalid date", "Enter the transaction date as YYYY-MM-DD.");
      return;
    }

    try {
      setSaving(true);

      await saveExpense(user.uid, {
        amount: parsedAmount,
        category,
        notes,
        groupIds: selectedGroupIds,
        date: parsedDate
      });

      // Reset the form after Firestore confirms the write.
      setQuickLogText("");
      setQuickLogMessage("");
      setParsedType(null);
      setAmount("");
      setCategory("");
      setNotes("");
      setTransactionDate(formatLocalDate());
      setSelectedGroupIds([]);
      setConfirmation("Expense saved.");
      setTimeout(() => setConfirmation(""), 2200);
    } catch (error) {
      console.warn("Unable to save expense.", error);
      Alert.alert("Save failed", "Check your Firebase config and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.quickLogCard}>
            <View style={styles.quickLogHeading}>
              <View style={styles.quickLogIcon}>
                <Ionicons name="sparkles" size={18} color="#7C3AED" />
              </View>
              <View style={styles.quickLogHeadingText}>
                <Text style={styles.quickLogTitle}>AI Quick Log</Text>
                <Text style={styles.quickLogSubtitle}>Describe it naturally, then review the filled form.</Text>
              </View>
            </View>

            <TextInput
              value={quickLogText}
              onChangeText={setQuickLogText}
              placeholder="Lunch at McDonald's $12.80"
              multiline
              maxLength={500}
              style={[styles.input, styles.quickLogInput]}
              testID="quick-log-input"
            />

            <Pressable
              onPress={handleQuickLog}
              disabled={parsingQuickLog}
              style={({ pressed }) => [
                styles.quickLogButton,
                pressed && !parsingQuickLog ? styles.quickLogButtonPressed : null,
                parsingQuickLog ? styles.submitButtonDisabled : null
              ]}
            >
              {parsingQuickLog ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.quickLogButtonText}>Fill expense with AI</Text>
                </>
              )}
            </Pressable>

            {quickLogMessage ? (
              <View style={styles.quickLogMessage}>
                <Ionicons
                  name={parsedType === "income" ? "information-circle-outline" : "checkmark-circle-outline"}
                  size={18}
                  color={parsedType === "income" ? "#B45309" : "#166534"}
                />
                <Text
                  style={[
                    styles.quickLogMessageText,
                    parsedType === "income" ? styles.quickLogIncomeMessage : null
                  ]}
                >
                  {quickLogMessage}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Review or enter manually</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={(value) => {
              setAmount(value);
              if (parsedType === "income") {
                setParsedType(null);
                setQuickLogMessage("Income detection cleared. Review this carefully before saving as an expense.");
              }
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Category</Text>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setCategoryModalVisible(true);
            }}
            style={({ pressed }) => [styles.categoryField, pressed ? styles.categoryFieldPressed : null]}
          >
            <Text style={[styles.categoryText, !category ? styles.categoryPlaceholder : null]}>
              {category || "Choose category"}
            </Text>
            <Text style={styles.categoryChevron}>Change</Text>
          </Pressable>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional"
            multiline
            style={[styles.input, styles.notesInput]}
          />

          <Text style={styles.label}>Transaction date</Text>
          <TextInput
            value={transactionDate}
            onChangeText={setTransactionDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10}
            style={styles.input}
          />

          <Text style={styles.label}>Sharing</Text>
          <View style={styles.sharingSection}>
            <Text style={styles.sharingText}>Every expense is saved to your personal history.</Text>

            {activeGroups.length > 0 ? (
              <>
                <Text style={styles.sharingSubheading}>Also show in:</Text>
                <View style={styles.groupList}>
                  {activeGroups.map((group) => {
                    const selected = selectedGroupIds.includes(group.id);

                    return (
                      <Pressable
                        key={group.id}
                        onPress={() => toggleGroupSelection(group.id)}
                        style={({ pressed }) => [
                          styles.groupOption,
                          selected ? styles.groupOptionSelected : null,
                          pressed ? styles.groupOptionPressed : null
                        ]}
                      >
                        <Ionicons
                          name={selected ? "checkbox" : "square-outline"}
                          size={22}
                          color={selected ? "#2563EB" : "#94A3B8"}
                        />
                        <Text style={styles.groupOptionText} numberOfLines={1}>
                          {group.name || "Shared budget"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={styles.sharingMuted}>Join or create a group to share expenses.</Text>
            )}
          </View>

          {confirmation ? <Text style={styles.confirmation}>{confirmation}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={saving}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && !saving ? styles.submitButtonPressed : null,
              saving ? styles.submitButtonDisabled : null
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </Pressable>
          </View>
        </ScrollView>

        <Modal
          animationType="fade"
          transparent
          visible={categoryModalVisible}
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCategoryModalVisible(false)}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>Choose category</Text>
              {CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setCategory(item);
                    setCategoryModalVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.categoryOption,
                    item === category ? styles.categoryOptionSelected : null,
                    pressed ? styles.categoryOptionPressed : null
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      item === category ? styles.categoryOptionTextSelected : null
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  form: {
    gap: 10
  },
  quickLogCard: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE",
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  quickLogHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  quickLogIcon: {
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    borderRadius: 20,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  quickLogHeadingText: {
    flex: 1
  },
  quickLogTitle: {
    color: "#4C1D95",
    fontSize: 17,
    fontWeight: "800"
  },
  quickLogSubtitle: {
    color: "#6D28D9",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
  },
  quickLogInput: {
    minHeight: 72,
    textAlignVertical: "top"
  },
  quickLogButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    flexDirection: "row",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  quickLogButtonPressed: {
    backgroundColor: "#6D28D9"
  },
  quickLogButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  quickLogMessage: {
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  quickLogMessageText: {
    color: "#166534",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  quickLogIncomeMessage: {
    color: "#92400E"
  },
  sectionDivider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginVertical: 18
  },
  dividerLine: {
    backgroundColor: "#CBD5E1",
    flex: 1,
    height: 1
  },
  dividerText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700"
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  categoryField: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  categoryFieldPressed: {
    backgroundColor: "#EFF6FF"
  },
  categoryText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600"
  },
  categoryPlaceholder: {
    color: "#94A3B8",
    fontWeight: "500"
  },
  categoryChevron: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700"
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  sharingSection: {
    gap: 8
  },
  sharingText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600"
  },
  sharingMuted: {
    color: "#64748B",
    fontSize: 13
  },
  sharingSubheading: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  groupList: {
    gap: 8
  },
  groupOption: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  groupOptionPressed: {
    backgroundColor: "#EFF6FF"
  },
  groupOptionSelected: {
    backgroundColor: "#F8FAFC",
    borderColor: "#93C5FD"
  },
  groupOptionText: {
    color: "#0F172A",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    minWidth: 0
  },
  confirmation: {
    color: "#15803D",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    marginTop: 12,
    paddingVertical: 14
  },
  submitButtonPressed: {
    backgroundColor: "#1D4ED8"
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
    padding: 16
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 4,
    paddingVertical: 10
  },
  categoryOption: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14
  },
  categoryOptionPressed: {
    backgroundColor: "#F1F5F9"
  },
  categoryOptionSelected: {
    backgroundColor: "#DBEAFE"
  },
  categoryOptionText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600"
  },
  categoryOptionTextSelected: {
    color: "#1D4ED8"
  }
});
