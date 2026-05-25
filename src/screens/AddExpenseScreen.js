import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { saveExpense } from "../services/firebase";

const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Others"];

export default function AddExpenseScreen() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  async function handleSubmit() {
    const parsedAmount = Number(amount);

    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid expense amount.");
      return;
    }

    try {
      setSaving(true);

      await saveExpense({
        amount: parsedAmount,
        category,
        notes
      });

      // Reset the form after Firestore confirms the write.
      setAmount("");
      setCategory(CATEGORIES[0]);
      setNotes("");
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
        <View style={styles.pickerWrap}>
          <Picker selectedValue={category} onValueChange={setCategory}>
            {CATEGORIES.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          multiline
          style={[styles.input, styles.notesInput]}
        />

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
    </KeyboardAvoidingView>
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
  pickerWrap: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: "top"
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
  }
});
