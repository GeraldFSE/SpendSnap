import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { saveExpense, subscribeToGroup } from "../services/firebase";

const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Others"];

export default function AddExpenseScreen({ user, groupIds }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [notes, setNotes] = useState("");
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

  async function handleSubmit() {
    const parsedAmount = Number(amount);

    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid expense amount.");
      return;
    }

    try {
      setSaving(true);

      await saveExpense(user.uid, {
        amount: parsedAmount,
        category,
        notes,
        groupIds: selectedGroupIds
      });

      // Reset the form after Firestore confirms the write.
      setAmount("");
      setCategory(CATEGORIES[0]);
      setNotes("");
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
        <View style={styles.form}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
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
            <Text style={styles.categoryText}>{category}</Text>
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
    backgroundColor: "#F8FAFC",
    padding: 16
  },
  form: {
    gap: 10
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
