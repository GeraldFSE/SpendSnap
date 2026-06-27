import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as QuickActions from "expo-quick-actions/build/index.js";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/HomeScreen";
import AddExpenseScreen from "../screens/AddExpenseScreen";
import SpendingSummaryScreen from "../screens/SpendingSummaryScreen";
import GroupScreen from "../screens/GroupScreen";
import HistoryScreen from "../screens/HistoryScreen";
import { subscribeToUserGroups } from "../services/firebase";

const Tab = createBottomTabNavigator();
const LOG_EXPENSE_ACTION_ID = "log-expense";

// Maps each tab to its Ionicons glyph (filled when focused, outline when not).
const TAB_ICONS = {
  Home: "home",
  "Add Expense": "add-circle",
  Summary: "stats-chart",
  History: "time",
  Group: "people"
};

export default function AppNavigator({ onSignOut, user }) {
  const navigationRef = useNavigationContainerRef();
  const pendingQuickActionRef = useRef(QuickActions.initial ?? null);
  const [groupIds, setGroupIds] = useState([]);

  useEffect(() => {
    // Resolves the user's group memberships once here so Add Expense can offer active
    // shared destinations and the Group tab knows which groups to render.
    const unsubscribe = subscribeToUserGroups(
      user.uid,
      (ids) => setGroupIds(ids),
      (error) => console.warn("Unable to load your groups.", error)
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
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { fontWeight: "700" },
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#64748B",
          tabBarIcon: ({ focused, color, size }) => {
            const name = TAB_ICONS[route.name] ?? "ellipse";
            return <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
          }
        })}
      >
        <Tab.Screen name="Home">
          {() => <HomeScreen onSignOut={onSignOut} user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Add Expense">
          {() => <AddExpenseScreen user={user} groupIds={groupIds} />}
        </Tab.Screen>
        <Tab.Screen name="Summary">
          {() => <SpendingSummaryScreen user={user} />}
        </Tab.Screen>
        <Tab.Screen name="History">
          {() => <HistoryScreen user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Group">
          {() => <GroupScreen user={user} groupIds={groupIds} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
