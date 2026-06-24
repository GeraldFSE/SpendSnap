// Unit + component tests run under the jest-expo preset (React Native environment).
// The Firestore emulator "system" tests live in system-tests/ and run via Node's own
// test runner (see the test:system npm script), so they're excluded here.
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/system-tests/", "/.expo/"],
  collectCoverageFrom: ["src/utils/**/*.js", "src/components/**/*.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))"
  ]
};
