const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export async function parseBankSmsAlert(smsText) {
  if (!smsText?.trim()) {
    throw new Error("SMS text is required.");
  }

  if (!OPENAI_API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_OPENAI_API_KEY.");
  }

  // Placeholder for the future SMS parsing feature.
  // For production, prefer calling a backend so the OpenAI key is not shipped in the app.
  return null;
}
