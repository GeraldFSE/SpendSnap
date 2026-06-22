import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { createGroup, joinGroup, leaveGroup, subscribeToGroup } from "../services/firebase";

export default function GroupScreen({ user, groupId }) {
  const inGroup = Boolean(groupId) && groupId !== user.uid;

  const [group, setGroup] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(inGroup);
  const [errorMessage, setErrorMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    if (!inGroup) {
      setGroup(null);
      setLoadingGroup(false);
      return;
    }

    setLoadingGroup(true);
    const unsubscribe = subscribeToGroup(
      groupId,
      (item) => {
        setGroup(item);
        setErrorMessage("");
        setLoadingGroup(false);
      },
      (error) => {
        console.warn("Unable to load group.", error);
        setErrorMessage("Unable to load group details.");
        setLoadingGroup(false);
      }
    );

    return unsubscribe;
  }, [groupId, inGroup]);

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      Alert.alert("Group name required", "Enter a name for your shared budget.");
      return;
    }

    try {
      setBusyAction("create");
      setErrorMessage("");
      await createGroup(user.uid, groupName);
      setGroupName("");
    } catch (error) {
      console.warn("Unable to create group.", error);
      setErrorMessage("Unable to create group. Check your connection and try again.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleJoinGroup() {
    if (!joinCode.trim()) {
      Alert.alert("Group code required", "Enter the invite code someone shared with you.");
      return;
    }

    try {
      setBusyAction("join");
      setErrorMessage("");
      await joinGroup(user.uid, joinCode);
      setJoinCode("");
    } catch (error) {
      console.warn("Unable to join group.", error);
      setErrorMessage("Unable to join that group. Double-check the code and try again.");
    } finally {
      setBusyAction("");
    }
  }

  function confirmLeaveGroup() {
    Alert.alert("Leave shared budget?", "You'll go back to tracking expenses on your own.", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: handleLeaveGroup }
    ]);
  }

  async function handleLeaveGroup() {
    try {
      setBusyAction("leave");
      setErrorMessage("");
      await leaveGroup(user.uid, groupId);
    } catch (error) {
      console.warn("Unable to leave group.", error);
      setErrorMessage("Unable to leave group. Try again.");
    } finally {
      setBusyAction("");
    }
  }

  const busy = Boolean(busyAction);
  const memberIds = group ? Object.keys(group.members ?? {}) : [];

  if (inGroup) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {loadingGroup ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.mutedText}>Loading group...</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Shared budget</Text>
              <Text style={styles.groupName}>{group?.name ?? "Shared budget"}</Text>

              <Text style={styles.label}>Invite code</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText} selectable>
                  {groupId}
                </Text>
              </View>
              <Text style={styles.mutedText}>Share this code so others can join from their Group tab.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Members ({memberIds.length})</Text>
              {memberIds.map((memberId) => (
                <Text key={memberId} style={styles.memberRow}>
                  {memberId === user.uid ? "You" : `Member ${memberId.slice(0, 6)}`}
                </Text>
              ))}
            </View>

            <Pressable
              onPress={confirmLeaveGroup}
              disabled={busy}
              style={({ pressed }) => [
                styles.leaveButton,
                pressed && !busy ? styles.leaveButtonPressed : null,
                busy ? styles.buttonDisabled : null
              ]}
            >
              {busyAction === "leave" ? (
                <ActivityIndicator color="#991B1B" />
              ) : (
                <Text style={styles.leaveText}>Leave shared budget</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Create a shared budget</Text>
          <Text style={styles.mutedText}>Start a group and invite friends or family to log expenses together.</Text>

          <TextInput value={groupName} onChangeText={setGroupName} placeholder="e.g. Roommates" style={styles.input} />

          <Pressable
            onPress={handleCreateGroup}
            disabled={busy}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !busy ? styles.primaryButtonPressed : null,
              busy ? styles.buttonDisabled : null
            ]}
          >
            {busyAction === "create" ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Create group</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Join a shared budget</Text>
          <Text style={styles.mutedText}>Enter the invite code someone shared with you.</Text>

          <TextInput
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="Invite code"
            autoCapitalize="none"
            style={styles.input}
          />

          <Pressable
            onPress={handleJoinGroup}
            disabled={busy}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !busy ? styles.secondaryButtonPressed : null,
              busy ? styles.buttonDisabled : null
            ]}
          >
            {busyAction === "join" ? (
              <ActivityIndicator color="#1D4ED8" />
            ) : (
              <Text style={styles.secondaryText}>Join group</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  mutedText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 6
  },
  errorText: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    fontWeight: "700",
    padding: 12
  },
  card: {
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
  groupName: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16
  },
  codeBox: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  codeText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700"
  },
  memberRow: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    marginTop: 14,
    paddingVertical: 14
  },
  primaryButtonPressed: {
    backgroundColor: "#1D4ED8"
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    marginTop: 14,
    paddingVertical: 14
  },
  secondaryButtonPressed: {
    backgroundColor: "#DBEAFE"
  },
  secondaryText: {
    color: "#1D4ED8",
    fontSize: 16,
    fontWeight: "800"
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  divider: {
    backgroundColor: "#E2E8F0",
    flex: 1,
    height: 1
  },
  dividerText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800"
  },
  leaveButton: {
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingVertical: 14
  },
  leaveButtonPressed: {
    backgroundColor: "#FECACA"
  },
  leaveText: {
    color: "#991B1B",
    fontSize: 15,
    fontWeight: "800"
  },
  buttonDisabled: {
    opacity: 0.7
  }
});