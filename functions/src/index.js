"use strict";

const crypto = require("node:crypto");
const OpenAI = require("openai");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const {
  ParserInputError,
  ParserOutputError,
  parseExpenseTextWithOpenAI
} = require("./parser");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function safetyIdentifierFor(userId) {
  return crypto.createHash("sha256").update(`spendsnap:${userId}`).digest("hex");
}

function fallbackToday() {
  return new Date().toISOString().slice(0, 10);
}

exports.parseExpenseText = onCall(
  {
    region: "asia-southeast1",
    invoker: "public",
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 30,
    memory: "256MiB"
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in before using Quick Log.");
    }

    const client = new OpenAI({
      apiKey: OPENAI_API_KEY.value(),
      maxRetries: 1,
      timeout: 15000
    });

    try {
      return await parseExpenseTextWithOpenAI({
        client,
        text: request.data?.text,
        today: request.data?.today || fallbackToday(),
        safetyIdentifier: safetyIdentifierFor(request.auth.uid)
      });
    } catch (error) {
      if (error instanceof ParserInputError) {
        throw new HttpsError("invalid-argument", error.message);
      }

      if (
        error?.name === "APIConnectionTimeoutError" ||
        error?.name === "AbortError" ||
        error?.code === "ETIMEDOUT"
      ) {
        throw new HttpsError("deadline-exceeded", "Quick Log timed out. Continue with manual entry.");
      }

      logger.error("parseExpenseText failed", {
        errorName: error?.name || "Error",
        parserOutputInvalid: error instanceof ParserOutputError
      });
      throw new HttpsError("unavailable", "Quick Log could not parse that description right now.");
    }
  }
);
