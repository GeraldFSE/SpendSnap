// System / integration tests that exercise the real Firestore security rules and the
// app's data model end to end against the Firestore emulator.
//
// Run with:  npm run test:system   (wraps this in `firebase emulators:exec`)
//
// The helpers below mirror what src/services/firebase.js does, so these tests assert the
// actual contract the app depends on (collections, fields, queries) and that the deployed
// rules permit/deny the right operations.
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  where
} from "firebase/firestore";

setLogLevel("error");

const here = path.dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(path.join(here, "..", "firestore.rules"), "utf8");

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "spendsnap-test",
    firestore: { rules }
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// --- helpers that mirror src/services/firebase.js, parameterized by a Firestore db ---

function db(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function expensesCol(d, uid) {
  return collection(d, "users", uid, "expenses");
}

function groupsSettings(d, uid) {
  return doc(d, "users", uid, "settings", "groups");
}

async function saveExpense(d, uid, { amount = 10, category = "Food", groupIds = [] } = {}) {
  return addDoc(expensesCol(d, uid), {
    amount,
    category,
    notes: "",
    date: serverTimestamp(),
    userId: uid,
    groupIds
  });
}

async function createGroup(d, uid, name, email) {
  const ref = doc(collection(d, "groups"));
  await setDoc(ref, {
    name,
    ownerId: uid,
    members: { [uid]: true },
    memberEmails: email ? { [uid]: email } : {},
    createdAt: serverTimestamp()
  });
  await setDoc(groupsSettings(d, uid), { ids: arrayUnion(ref.id) }, { merge: true });
  return ref.id;
}

async function joinGroup(d, uid, gid, email) {
  await setDoc(
    doc(d, "groups", gid),
    { members: { [uid]: true }, ...(email ? { memberEmails: { [uid]: email } } : {}) },
    { merge: true }
  );
  await setDoc(groupsSettings(d, uid), { ids: arrayUnion(gid) }, { merge: true });
}

async function leaveGroup(d, uid, gid) {
  await updateDoc(doc(d, "groups", gid), {
    [`members.${uid}`]: deleteField(),
    [`memberEmails.${uid}`]: deleteField()
  });
  await setDoc(groupsSettings(d, uid), { ids: arrayRemove(gid) }, { merge: true });
  const snap = await getDocs(expensesCol(d, uid));
  for (const docSnap of snap.docs) {
    await updateDoc(docSnap.ref, { groupIds: arrayRemove(gid) });
  }
}

function personalQuery(d, uid) {
  return query(expensesCol(d, uid), orderBy("date", "desc"));
}

function groupQuery(d, gid) {
  return query(collectionGroup(d, "expenses"), where("groupIds", "array-contains", gid), orderBy("date", "desc"));
}

describe("groups security rules", () => {
  test("a signed-out user cannot read a group", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "groups", gid)));
  });

  test("a member can read their group; a non-member cannot", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    await assertSucceeds(getDoc(doc(db("alice"), "groups", gid)));
    await assertFails(getDoc(doc(db("bob"), "groups", gid)));
  });

  test("listing/querying all groups is denied", async () => {
    await createGroup(db("alice"), "alice", "Flat");
    await assertFails(getDocs(collection(db("alice"), "groups")));
  });

  test("creating a group requires the caller to be owner and a member", async () => {
    await assertSucceeds(createGroup(db("alice"), "alice", "Flat"));

    // ownerId must be the caller
    const ref = doc(collection(db("alice"), "groups"));
    await assertFails(setDoc(ref, { name: "x", ownerId: "bob", members: { alice: true } }));

    // caller must include themselves as a member
    const ref2 = doc(collection(db("alice"), "groups"));
    await assertFails(setDoc(ref2, { name: "x", ownerId: "alice", members: { bob: true } }));
  });

  test("a stranger can join via invite code (self-join only)", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    await assertSucceeds(joinGroup(db("bob"), "bob", gid));

    const groupSnap = await getDoc(doc(db("alice"), "groups", gid));
    assert.equal(groupSnap.data().members.bob, true);
  });

  test("a joiner cannot hijack ownerId or add someone else", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");

    await assertFails(
      setDoc(doc(db("bob"), "groups", gid), { ownerId: "bob", members: { bob: true } }, { merge: true })
    );
    await assertFails(
      setDoc(doc(db("bob"), "groups", gid), { members: { carol: true } }, { merge: true })
    );
  });

  test("only the owner can delete the group", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    await joinGroup(db("bob"), "bob", gid);

    await assertFails(deleteDoc(doc(db("bob"), "groups", gid)));
    await assertSucceeds(deleteDoc(doc(db("alice"), "groups", gid)));
  });

  test("a non-owner member cannot rename the group", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    await joinGroup(db("bob"), "bob", gid);

    await assertFails(updateDoc(doc(db("bob"), "groups", gid), { name: "Hijacked name" }));
    await assertSucceeds(updateDoc(doc(db("alice"), "groups", gid), { name: "Flat budget" }));
  });

  test("only the owner can archive the group", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    await joinGroup(db("bob"), "bob", gid);

    await assertFails(updateDoc(doc(db("bob"), "groups", gid), { archived: true, archivedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db("alice"), "groups", gid), { archived: true, archivedAt: serverTimestamp() }));
  });

  test("an archived group cannot be joined with its invite code", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    await updateDoc(doc(db("alice"), "groups", gid), { archived: true, archivedAt: serverTimestamp() });

    await assertFails(joinGroup(db("bob"), "bob", gid));
  });

  test("a member cannot remove another member", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat", "alice@example.com");
    await joinGroup(db("bob"), "bob", gid, "bob@example.com");

    await assertFails(
      updateDoc(doc(db("bob"), "groups", gid), {
        "members.alice": deleteField(),
        "memberEmails.alice": deleteField()
      })
    );
  });

  test("a member cannot edit another member's email label", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat", "alice@example.com");
    await joinGroup(db("bob"), "bob", gid, "bob@example.com");

    await assertFails(updateDoc(doc(db("bob"), "groups", gid), { "memberEmails.alice": "fake@example.com" }));
    await assertSucceeds(updateDoc(doc(db("bob"), "groups", gid), { "memberEmails.bob": "bob-new@example.com" }));
  });
});

describe("expenses security rules", () => {
  test("a user can create and read their own expenses", async () => {
    await assertSucceeds(saveExpense(db("alice"), "alice", { amount: 10 }));
    const snap = await assertSucceeds(getDocs(personalQuery(db("alice"), "alice")));
    assert.equal(snap.size, 1);
  });

  test("a user cannot write into another user's subcollection", async () => {
    await assertFails(
      addDoc(collection(db("bob"), "users", "alice", "expenses"), {
        amount: 5,
        userId: "alice",
        date: serverTimestamp(),
        groupIds: []
      })
    );
  });

  test("a user cannot forge userId on their own expense", async () => {
    await assertFails(
      addDoc(expensesCol(db("alice"), "alice"), {
        amount: 5,
        userId: "bob",
        date: serverTimestamp(),
        groupIds: []
      })
    );
  });

  test("a user cannot read another user's expense directly", async () => {
    let aliceExpenseId;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), "users", "alice", "expenses"), {
        amount: 5,
        userId: "alice",
        date: serverTimestamp(),
        groupIds: []
      });
      aliceExpenseId = ref.id;
    });

    await assertFails(getDoc(doc(db("bob"), "users", "alice", "expenses", aliceExpenseId)));
  });

  test("group members can read each other's group-tagged expenses; outsiders cannot", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    await joinGroup(db("bob"), "bob", gid);
    await saveExpense(db("alice"), "alice", { amount: 10, groupIds: [gid] });
    await saveExpense(db("bob"), "bob", { amount: 20, groupIds: [gid] });

    const bobView = await assertSucceeds(getDocs(groupQuery(db("bob"), gid)));
    assert.equal(bobView.size, 2);

    // carol is not a member -> denied
    await assertFails(getDocs(groupQuery(db("carol"), gid)));
  });

  test("update and delete are limited to the expense's owner", async () => {
    const ref = await saveExpense(db("alice"), "alice", { amount: 10 });
    await assertFails(updateDoc(doc(db("bob"), "users", "alice", "expenses", ref.id), { amount: 999 }));
    await assertSucceeds(deleteDoc(doc(db("alice"), "users", "alice", "expenses", ref.id)));
  });
});

describe("settings security rules", () => {
  test("a user can read/write their own settings only", async () => {
    await assertSucceeds(setDoc(groupsSettings(db("alice"), "alice"), { ids: ["g1"] }));
    await assertSucceeds(getDoc(groupsSettings(db("alice"), "alice")));
    await assertFails(getDoc(groupsSettings(db("bob"), "alice")));
    await assertFails(setDoc(groupsSettings(db("bob"), "alice"), { ids: ["hacked"] }));
  });
});

describe("data model behavior", () => {
  test("a newly created group starts at 0 and only counts expenses logged afterwards", async () => {
    // alice has a pre-existing solo expense (not tagged into any group)
    await saveExpense(db("alice"), "alice", { amount: 100, groupIds: [] });

    const gid = await createGroup(db("alice"), "alice", "Flat");
    await joinGroup(db("bob"), "bob", gid);

    // The group sees nothing yet -- past spending is not backfilled.
    const before = await getDocs(groupQuery(db("alice"), gid));
    assert.equal(before.size, 0);

    // A new expense explicitly tagged into the group appears there.
    await saveExpense(db("alice"), "alice", { amount: 30, groupIds: [gid] });
    const after = await getDocs(groupQuery(db("alice"), gid));
    assert.equal(after.size, 1);
    assert.equal(after.docs[0].data().amount, 30);
  });

  test("an expense can be tagged into multiple selected groups", async () => {
    const g1 = await createGroup(db("alice"), "alice", "Flat");
    const g2 = await createGroup(db("alice"), "alice", "Trip");
    await saveExpense(db("alice"), "alice", { amount: 40, groupIds: [g1, g2] });

    assert.equal((await getDocs(groupQuery(db("alice"), g1))).size, 1);
    assert.equal((await getDocs(groupQuery(db("alice"), g2))).size, 1);
  });

  test("leaving a group removes the member's contributions and email from it", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat", "alice@example.com");
    await joinGroup(db("bob"), "bob", gid, "bob@example.com");
    await saveExpense(db("alice"), "alice", { amount: 10, groupIds: [gid] });
    await saveExpense(db("bob"), "bob", { amount: 20, groupIds: [gid] });

    await leaveGroup(db("alice"), "alice", gid);

    // bob (still a member) now sees only his own spending in the group
    const remaining = await getDocs(groupQuery(db("bob"), gid));
    assert.equal(remaining.size, 1);
    assert.equal(remaining.docs[0].data().userId, "bob");

    const groupSnap = await getDoc(doc(db("bob"), "groups", gid));
    assert.equal(groupSnap.data().members.alice, undefined);
    assert.equal(groupSnap.data().memberEmails.alice, undefined);
  });

  test("member emails are stored on create/join and visible to fellow members", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat", "alice@example.com");
    await joinGroup(db("bob"), "bob", gid, "bob@example.com");

    const snap = await getDoc(doc(db("bob"), "groups", gid));
    assert.equal(snap.data().memberEmails.alice, "alice@example.com");
    assert.equal(snap.data().memberEmails.bob, "bob@example.com");
  });

  test("a member can backfill their email onto a group that lacks it", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat"); // created without email
    await joinGroup(db("bob"), "bob", gid);

    // ensureMemberEmail-style write by an existing member
    await assertSucceeds(
      setDoc(doc(db("bob"), "groups", gid), { memberEmails: { bob: "bob@example.com" } }, { merge: true })
    );
    const snap = await getDoc(doc(db("alice"), "groups", gid));
    assert.equal(snap.data().memberEmails.bob, "bob@example.com");
  });

  test("personal queries return only the caller's own expenses", async () => {
    const gid = await createGroup(db("alice"), "alice", "Flat");
    await joinGroup(db("bob"), "bob", gid);
    await saveExpense(db("alice"), "alice", { amount: 10, groupIds: [gid] });
    await saveExpense(db("bob"), "bob", { amount: 20, groupIds: [gid] });

    const aliceOwn = await getDocs(personalQuery(db("alice"), "alice"));
    assert.equal(aliceOwn.size, 1);
    assert.equal(aliceOwn.docs[0].data().userId, "alice");
  });
});
