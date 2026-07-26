"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseExpenseTextWithOpenAI } = require("../src/parser");

const TODAY = "2026-07-27";

function mockClient(output) {
  return {
    responses: {
      create: async () => ({
        output_text: JSON.stringify(output)
      })
    }
  };
}

async function parse(text, output) {
  return parseExpenseTextWithOpenAI({
    client: mockClient(output),
    text,
    today: TODAY,
    safetyIdentifier: "test-user"
  });
}

test("extracts a clear expense", async () => {
  const result = await parse("Lunch at McDonald's $12.80", {
    merchant: "McDonald's",
    amount: 12.8,
    category: "Food",
    type: "expense",
    date: TODAY
  });

  assert.deepEqual(result, {
    merchant: "McDonald's",
    amount: 12.8,
    category: "Food",
    type: "expense",
    date: TODAY,
    complete: true,
    message: ""
  });
});

test("preserves a missing category as an editable blank", async () => {
  const result = await parse("Paid Acme $42", {
    merchant: "Acme",
    amount: 42,
    category: null,
    type: "expense",
    date: TODAY
  });

  assert.equal(result.category, null);
  assert.equal(result.complete, false);
  assert.match(result.message, /unclear/i);
});

test("defaults a missing date to today", async () => {
  const result = await parse("Grab ride 15.50", {
    merchant: "Grab",
    amount: 15.5,
    category: "Transport",
    type: "expense",
    date: null
  });

  assert.equal(result.date, TODAY);
});

test("returns confident fields for ambiguous or incomplete input", async () => {
  const result = await parse("Maybe around $20 at the shop", {
    merchant: null,
    amount: 20,
    category: "Shopping",
    type: "expense",
    date: TODAY
  });

  assert.equal(result.amount, 20);
  assert.equal(result.merchant, null);
  assert.equal(result.complete, false);
});

test("returns safe blanks for non-transaction gibberish", async () => {
  const result = await parse("purple clouds sing loudly", {
    merchant: null,
    amount: null,
    category: null,
    type: null,
    date: null
  });

  assert.deepEqual(result, {
    merchant: null,
    amount: null,
    category: null,
    type: null,
    date: null,
    complete: false,
    message: "I couldn't identify a transaction. Continue with manual entry."
  });
});
