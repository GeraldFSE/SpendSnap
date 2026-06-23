import React, { useEffect, useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import PieChart from "../components/PieChart";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  subscribeToGroup,
  subscribeToGroupExpenses
} from "../services/firebase";
import { formatCurrency } from "../utils/currency";

// Distinct slice colors so each member reads as their own wedge in the pie.
const USER_COLORS = ["#2563EB", "#0F766E", "#EA580C", "#7C3AED", "#C2410C", "#0891B2", "#DB2777", "#65A30D"];

function memberName(memberId, currentUserId) {
  return memberId === currentUserId ? "You" : `Member ${memberId?.slice(0, 6)}`;
}

function sumByKey(expenses, keyFor) {
  const totals = new Map();

  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    const key = keyFor(expense);
    totals.set(key, (totals.get(key) ?? 0) + amount);
  });

  return totals;
}

function Disclosure({ icon, title, open, onToggle, children }) {
  return (
    <View style={styles.disclosure}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.disclosureHeader, pressed ? styles.rowPressed : null]}
      >
        <View style={styles.disclosureTitleRow}>
          {icon ? <Ionicons name={icon} size={16} color="#475569" /> : null}
          <Text style={styles.disclosureTitle}>{title}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
      </Pressable>
      {open ? <View style={styles.disclosureBody}>{children}</View> : null}
    </View>
  );
}

function GroupCard({ groupId, user, onLeave, leaving }) {
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToGroup(
      groupId,
      (item) => setGroup(item),
      (error) => console.warn("Unable to load group.", error)
    );
    return unsubscribe;
  }, [groupId]);

  useEffect(() => {
    // Only stream the group's expenses once the card is open, to avoid extra reads.
    if (!expanded) {
      return undefined;
    }

    setLoadingExpenses(true);
    const unsubscribe = subscribeToGroupExpenses(
      groupId,
      (items) => {
        setExpenses(items);
        setLoadingExpenses(false);
      },
      (error) => {
        console.warn("Unable to load group spending.", error);
        setLoadingExpenses(false);
      }
    );
    return unsubscribe;
  }, [groupId, expanded]);

  const memberIds = useMemo(() => (group ? Object.keys(group.members ?? {}) : []), [group]);
  const groupTotal = useMemo(
    () => expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [expenses]
  );

  // One pie slice per member who has spent, colored consistently by member order.
  const userSlices = useMemo(() => {
    const colorFor = new Map(memberIds.map((id, index) => [id, USER_COLORS[index % USER_COLORS.length]]));
    const totals = sumByKey(expenses, (expense) => expense.userId);

    return Array.from(totals.entries())
      .map(([userId, value]) => ({
        key: userId,
        value,
        color: colorFor.get(userId) ?? USER_COLORS[0],
        label: memberName(userId, user.uid)
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, memberIds, user.uid]);

  const selectedBreakdown = useMemo(() => {
    if (!selectedUser) {
      return [];
    }

    const totals = sumByKey(
      expenses.filter((expense) => expense.userId === selectedUser),
      (expense) => expense.category || "Others"
    );

    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, selectedUser]);

  function handleSlicePress(userId) {
    setSelectedUser((current) => (current === userId ? null : userId));
  }

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.groupHeader, pressed ? styles.rowPressed : null]}
      >
        <View style={styles.groupHeaderText}>
          <Text style={styles.cardEyebrow}>Shared budget</Text>
          <Text style={styles.groupName} numberOfLines={1}>
            {group?.name ?? "Shared budget"}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={22} color="#64748B" />
      </Pressable>

      {expanded ? (
        <View style={styles.groupBody}>
          <Disclosure icon="key-outline" title="Invite code" open={showCode} onToggle={() => setShowCode((v) => !v)}>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} selectable>
                {groupId}
              </Text>
            </View>
            <Text style={styles.mutedText}>Share this code so others can join from their Group tab.</Text>
          </Disclosure>

          <Disclosure
            icon="people-outline"
            title={`Members (${memberIds.length})`}
            open={showMembers}
            onToggle={() => setShowMembers((v) => !v)}
          >
            {memberIds.map((memberId) => (
              <Text key={memberId} style={styles.memberRow}>
                {memberName(memberId, user.uid)}
              </Text>
            ))}
          </Disclosure>

          <Disclosure
            icon="pie-chart-outline"
            title="Spending by member"
            open={showBreakdown}
            onToggle={() => setShowBreakdown((v) => !v)}
          >
            {loadingExpenses ? (
              <View style={styles.centeredRow}>
                <ActivityIndicator color="#2563EB" />
                <Text style={styles.mutedText}>Loading spending...</Text>
              </View>
            ) : userSlices.length === 0 ? (
              <Text style={styles.mutedText}>No spending in this group yet.</Text>
            ) : (
              <>
                <View style={styles.chartRow}>
                  <PieChart
                    data={userSlices}
                    size={180}
                    selectedKey={selectedUser}
                    onSlicePress={handleSlicePress}
                  />
                </View>
                <Text style={styles.hintText}>Tap a slice to see that member's categories.</Text>

                <View style={styles.legend}>
                  {userSlices.map((slice) => {
                    const selected = selectedUser === slice.key;
                    return (
                      <Pressable
                        key={slice.key}
                        onPress={() => handleSlicePress(slice.key)}
                        style={({ pressed }) => [
                          styles.legendRow,
                          selected ? styles.legendRowSelected : null,
                          pressed ? styles.rowPressed : null
                        ]}
                      >
                        <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                        <Text style={styles.legendLabel} numberOfLines={1}>
                          {slice.label}
                        </Text>
                        <Text style={styles.legendValue}>{formatCurrency(slice.value)}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {selectedUser ? (
                  <View style={styles.breakdownPanel}>
                    <Text style={styles.breakdownTitle}>
                      {memberName(selectedUser, user.uid)} · by category
                    </Text>
                    {selectedBreakdown.length === 0 ? (
                      <Text style={styles.mutedText}>No expenses yet.</Text>
                    ) : (
                      selectedBreakdown.map((item) => (
                        <View key={item.category} style={styles.breakdownRow}>
                          <Text style={styles.breakdownCategory}>{item.category}</Text>
                          <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </>
            )}
          </Disclosure>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Group total</Text>
            <Text style={styles.totalValue}>{formatCurrency(groupTotal)}</Text>
          </View>

          <Pressable
            onPress={() => onLeave(groupId, group?.name)}
            disabled={leaving}
            style={({ pressed }) => [
              styles.leaveButton,
              pressed && !leaving ? styles.leaveButtonPressed : null,
              leaving ? styles.buttonDisabled : null
            ]}
          >
            {leaving ? (
              <ActivityIndicator color="#991B1B" />
            ) : (
              <Text style={styles.leaveText}>Leave group</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function GroupScreen({ user, groupIds }) {
  const [errorMessage, setErrorMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [leavingId, setLeavingId] = useState("");

  const groups = Array.isArray(groupIds) ? groupIds : [];

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

  function confirmLeaveGroup(groupId, name) {
    Alert.alert(
      "Leave group?",
      `Your expenses will stop showing in ${name || "this group"}. You can rejoin with the invite code.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => handleLeaveGroup(groupId) }
      ]
    );
  }

  async function handleLeaveGroup(groupId) {
    try {
      setLeavingId(groupId);
      setErrorMessage("");
      await leaveGroup(user.uid, groupId);
    } catch (error) {
      console.warn("Unable to leave group.", error);
      setErrorMessage("Unable to leave group. Try again.");
    } finally {
      setLeavingId("");
    }
  }

  const busy = Boolean(busyAction);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {groups.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Your groups ({groups.length})</Text>
            {groups.map((groupId) => (
              <GroupCard
                key={groupId}
                groupId={groupId}
                user={user}
                onLeave={confirmLeaveGroup}
                leaving={leavingId === groupId}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.mutedText}>Create a shared budget or join one with an invite code.</Text>
          </View>
        )}

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
  sectionLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  mutedText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 6
  },
  hintText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center"
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
  groupHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  groupHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12
  },
  groupName: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4
  },
  groupBody: {
    gap: 12,
    marginTop: 14
  },
  rowPressed: {
    opacity: 0.6
  },
  disclosure: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  disclosureHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12
  },
  disclosureTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  disclosureTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800"
  },
  disclosureBody: {
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    padding: 12
  },
  codeBox: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
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
    marginTop: 8
  },
  centeredRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12
  },
  chartRow: {
    alignItems: "center",
    paddingVertical: 8
  },
  legend: {
    gap: 4,
    marginTop: 10
  },
  legendRow: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  legendRowSelected: {
    backgroundColor: "#EFF6FF"
  },
  legendDot: {
    borderRadius: 6,
    height: 12,
    width: 12
  },
  legendLabel: {
    color: "#0F172A",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minWidth: 0
  },
  legendValue: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700"
  },
  breakdownPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 12
  },
  breakdownTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  breakdownCategory: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600"
  },
  breakdownAmount: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700"
  },
  totalRow: {
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  totalLabel: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "800"
  },
  totalValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
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
    paddingVertical: 12
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
  },
  emptyState: {
    alignItems: "center",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: 24
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6
  }
});
