import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { signInAsGuest, signInWithEmail, signUpWithEmail } from "../services/firebase";

function getAuthErrorMessage(error) {
  const code = error?.code ?? "";

  if (code.includes("invalid-email")) {
    return "Enter a valid email address.";
  }

  if (code.includes("email-already-in-use")) {
    return "An account already exists for this email.";
  }

  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Email or password is incorrect.";
  }

  if (code.includes("weak-password")) {
    return "Use a password with at least 6 characters.";
  }

  if (code.includes("operation-not-allowed")) {
    return "Enable this sign-in method in Firebase Authentication.";
  }

  return "Unable to sign in. Check your connection and Firebase Auth setup.";
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  async function handleAuth(action) {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Use a password with at least 6 characters.");
      return;
    }

    try {
      setErrorMessage("");
      setLoadingAction(action);

      if (action === "create") {
        await signUpWithEmail(trimmedEmail, password);
        return;
      }

      await signInWithEmail(trimmedEmail, password);
    } catch (error) {
      console.warn("Authentication failed.", error);
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function handleGuestSignIn() {
    try {
      setErrorMessage("");
      setLoadingAction("guest");
      await signInAsGuest();
    } catch (error) {
      console.warn("Guest sign-in failed.", error);
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  const signingIn = loadingAction === "login";
  const creatingAccount = loadingAction === "create";
  const continuingAsGuest = loadingAction === "guest";
  const busy = Boolean(loadingAction);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.logo}>SpendSnap</Text>
            <Text style={styles.title}>Track your spending</Text>
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>

            <View>
              <Text style={styles.label}>Password</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secureTextEntry
                style={styles.input}
                textContentType="password"
                value={password}
              />
            </View>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            disabled={busy}
            onPress={() => handleAuth("login")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !busy ? styles.primaryButtonPressed : null,
              busy ? styles.buttonDisabled : null
            ]}
          >
            {signingIn ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Log in</Text>}
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={() => handleAuth("create")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !busy ? styles.secondaryButtonPressed : null,
              busy ? styles.buttonDisabled : null
            ]}
          >
            {creatingAccount ? (
              <ActivityIndicator color="#1D4ED8" />
            ) : (
              <Text style={styles.secondaryText}>Create account</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            disabled={busy}
            onPress={handleGuestSignIn}
            style={({ pressed }) => [
              styles.guestButton,
              pressed && !busy ? styles.guestButtonPressed : null,
              busy ? styles.buttonDisabled : null
            ]}
          >
            {continuingAsGuest ? (
              <ActivityIndicator color="#334155" />
            ) : (
              <Text style={styles.guestText}>Continue as guest</Text>
            )}
          </Pressable>

          <Text style={styles.guestNote}>Guest data is tied to this device until you create an account.</Text>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    padding: 16
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18
  },
  header: {
    marginBottom: 20
  },
  logo: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "900"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8
  },
  form: {
    gap: 12
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 7
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
  errorText: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
    padding: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    marginTop: 16,
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
    marginTop: 10,
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
    gap: 10,
    marginVertical: 16
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
  guestButton: {
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingVertical: 14
  },
  guestButtonPressed: {
    backgroundColor: "#E2E8F0"
  },
  guestText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "800"
  },
  guestNote: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    textAlign: "center"
  },
  buttonDisabled: {
    opacity: 0.7
  }
});
