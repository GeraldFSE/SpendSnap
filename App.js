import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { signOutUser, subscribeToAuthState } from "./src/services/firebase";
import AppNavigator from "./src/navigation/AppNavigator";
import LoginScreen from "./src/screens/LoginScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(
      (currentUser) => {
        setUser(currentUser);
        setCheckingAuth(false);
      },
      (error) => {
        console.warn("Unable to read auth state.", error);
        setCheckingAuth(false);
      }
    );

    return unsubscribe;
  }, []);

  async function handleSignOut() {
    try {
      await signOutUser();
    } catch (error) {
      console.warn("Unable to sign out.", error);
      Alert.alert("Sign out failed", "Check your connection and try again.");
    }
  }

  if (checkingAuth) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.mutedText}>Loading SpendSnap...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AppNavigator onSignOut={handleSignOut} user={user} />;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  mutedText: {
    color: "#64748B",
    fontSize: 15,
    marginTop: 12,
    textAlign: "center"
  }
});
