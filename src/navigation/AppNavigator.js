import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as QuickActions from "expo-quick-actions/build/index.js";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import AddExpenseScreen from "../screens/AddExpenseScreen";
import SpendingSummaryScreen from "../screens/SpendingSummaryScreen";
import GroupScreen from "../screens/GroupScreen";
import HistoryScreen from "../screens/HistoryScreen";
import { subscribeToUserGroupId } from "../services/firebase";

const Tab = createBottomTabNavigator();
const LOG_EXPENSE_ACTION_ID = "log-expense";

export default function AppNavigator({ onSignOut, user }) {
  const navigationRef = useNavigationContainerRef();
  const pendingQuickActionRef = useRef(QuickActions.initial ?? null);
  const [groupId, setGroupId] = useState(user.uid);

  useEffect(() => {
    // Resolves once here so every screen (Home, Add Expense, Summary, Group, History)
    // reads/writes the same shared budget instead of each defaulting to the user's own uid.
    const unsubscribe = subscribeToUserGroupId(
      user.uid,
      (id) => setGroupId(id),
      (error) => console.warn("Unable to load current group.", error)
    );

    return unsubscribe;
  }, [user.uid]);

  const openAddExpenseScreen = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate("Add Expense");
      return;
    }

    pendingQuickActionRef.current = { id: LOG_EXPENSE_ACTION_ID };
  }, [navigationRef]);

  const handleQuickAction = useCallback(
    (action) => {
      if (action?.id === LOG_EXPENSE_ACTION_ID || action?.params?.screen === "AddExpense") {
        openAddExpenseScreen();
      }
    },
    [openAddExpenseScreen]
  );

  useEffect(() => {
    let subscription;

    async function configureQuickActions() {
      try {
        // Home Screen Quick Actions require a development/EAS build; guards keep Expo Go safe.
        if (typeof QuickActions.isSupported === "function") {
          const supported = await QuickActions.isSupported();
          if (!supported) {
            return;
          }
        }

        if (typeof QuickActions.setItems === "function") {
          await QuickActions.setItems([
            {
              id: LOG_EXPENSE_ACTION_ID,
              title: "Log Expense",
              subtitle: "Add a SpendSnap entry",
              params: { screen: "AddExpense" }
            }
          ]);
        }

        if (typeof QuickActions.addListener === "function") {
          subscription = QuickActions.addListener(handleQuickAction);
        }
      } catch (error) {
        console.warn("Quick Actions are unavailable in this runtime.", error);
      }
    }

    configureQuickActions();

    return () => {
      subscription?.remove?.();
    };
  }, [handleQuickAction]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        if (pendingQuickActionRef.current) {
          handleQuickAction(pendingQuickActionRef.current);
          pendingQuickActionRef.current = null;
        }
      }}
    >
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#64748B"
        }}
      >
        <Tab.Screen name="Home">
          {() => <HomeScreen onSignOut={onSignOut} user={user} groupId={groupId} />}
        </Tab.Screen>
        <Tab.Screen name="Add Expense">
          {() => <AddExpenseScreen user={user} groupId={groupId} />}
        </Tab.Screen>
        <Tab.Screen name="Summary">
          {() => <SpendingSummaryScreen user={user} groupId={groupId} />}
        </Tab.Screen>
        <Tab.Screen name="History">
          {() => <HistoryScreen user={user} groupId={groupId} />}
        </Tab.Screen>
        <Tab.Screen name="Group">
          {() => <GroupScreen user={user} groupId={groupId} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
