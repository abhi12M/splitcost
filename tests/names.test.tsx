import assert from "node:assert/strict";
import test from "node:test";

import { validateGroupInput } from "../src/lib/validations/group.schema";
import { hasDuplicateMemberNames, isMemberNameAlreadyAdded } from "../src/lib/validations/group-members";
import { cleanName, cleanText, isBlankName, isBlankText, nameKey } from "../src/lib/validations/names";
import { validateExpenseDescription } from "../src/lib/validations/expense.schema";
import { validateContactInput } from "../src/lib/validations/contact";
import { hasExpenseNotesContent, normalizeExpenseNotes } from "../src/lib/expenseNotes";
import { toSupportedCurrency } from "../src/constants/currencies";

// Built from code points so the test file contains no invisible characters.
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
const WORD_JOINER = String.fromCharCode(0x2060);
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);
const RIGHT_TO_LEFT_OVERRIDE = String.fromCharCode(0x202e);
const NO_BREAK_SPACE = String.fromCharCode(0x00a0);
const JOINER = String.fromCharCode(0x200d);

test("normal spaces are trimmed and runs of spaces become one", () => {
  assert.equal(cleanName("  Ann  "), "Ann");
  assert.equal(cleanName("Ann   Lee"), "Ann Lee");
  assert.equal(cleanName(`Ann${NO_BREAK_SPACE}Lee`), "Ann Lee");
  assert.equal(cleanName("Ann\tLee"), "Ann Lee");
});

test("invisible characters are removed, which trim() alone doesn't do", () => {
  assert.equal(ZERO_WIDTH_SPACE.trim(), ZERO_WIDTH_SPACE);
  assert.equal(cleanName(ZERO_WIDTH_SPACE), "");
  assert.equal(cleanName(`Ann${ZERO_WIDTH_SPACE}`), "Ann");
  assert.equal(cleanName(`${BYTE_ORDER_MARK}Ann${WORD_JOINER}`), "Ann");
  assert.equal(cleanName(`Ann${RIGHT_TO_LEFT_OVERRIDE}`), "Ann");
});

test("a name with nothing visible is blank", () => {
  assert.equal(isBlankName(""), true);
  assert.equal(isBlankName("   "), true);
  assert.equal(isBlankName(ZERO_WIDTH_SPACE + ZERO_WIDTH_SPACE), true);
  assert.equal(isBlankName(JOINER), true);
  assert.equal(isBlankName("Ann"), false);
});

test("joiners stay in Hindi names and emoji but are ignored when comparing", () => {
  const hindi = `क्${JOINER}ष`;
  assert.equal(cleanName(hindi), hindi);
  const family = ["👨", "👩", "👧"].join(JOINER);
  assert.equal(cleanName(family), family);
  assert.equal(nameKey(`Ann${JOINER}`), nameKey("Ann"));
});

test("duplicates are found through spacing, invisible characters and case", () => {
  assert.equal(isMemberNameAlreadyAdded(["Ann"], `Ann${ZERO_WIDTH_SPACE}`), true);
  assert.equal(isMemberNameAlreadyAdded(["Ann Lee"], "ann  lee"), true);
  assert.equal(hasDuplicateMemberNames(["Ann", " ANN "]), true);
  assert.equal(hasDuplicateMemberNames(["Ann", "Bee"]), false);
});

test("multi-line text keeps line breaks but drops invisible characters and extra blank lines", () => {
  assert.equal(cleanText(`  Hi${ZERO_WIDTH_SPACE}  \r\nthere  \n\n\n\nBye  `), "Hi\nthere\n\nBye");
  assert.equal(isBlankText(`${ZERO_WIDTH_SPACE}\n \n${BYTE_ORDER_MARK}`), true);
});

test("the expense description is checked and cleaned like a name", () => {
  assert.equal(validateExpenseDescription(ZERO_WIDTH_SPACE).success, false);
  assert.equal(validateExpenseDescription("   ").success, false);
  assert.equal(validateExpenseDescription(42).success, false);
  assert.equal(validateExpenseDescription("x".repeat(256)).success, false);
  assert.deepEqual(validateExpenseDescription(`  Goa${ZERO_WIDTH_SPACE}   dinner `), { success: true, data: "Goa dinner" });
});

test("notes made only of invisible characters or empty lines are no notes", () => {
  assert.equal(hasExpenseNotesContent(`<div>${ZERO_WIDTH_SPACE}${WORD_JOINER}</div>`), false);
  assert.equal(normalizeExpenseNotes(`<div>${RIGHT_TO_LEFT_OVERRIDE}</div><div><br></div>`), "");
  assert.equal(
    normalizeExpenseNotes(`<div><br></div>&nbsp;<div>Paid${ZERO_WIDTH_SPACE} cash</div><div><br></div><p> </p><br>`),
    "<div>Paid cash</div>"
  );
  assert.equal(normalizeExpenseNotes("<div>a</div><div><br></div><div>b</div>"), "<div>a</div><div><br></div><div>b</div>");
});

test("trimming notes stays fast on a long run of spaces", () => {
  const started = Date.now();
  normalizeExpenseNotes(`${" ".repeat(10000)}x`);
  normalizeExpenseNotes(`x${"<div><br></div>".repeat(700)}`);
  assert.ok(Date.now() - started < 500);
});

test("the contact API validator cleans fields and rejects blank ones and bad emails", () => {
  const valid = validateContactInput({
    name: `  Ann${ZERO_WIDTH_SPACE}  Lee `,
    email: " Ann@Example.com ",
    subject: "Bug   report",
    message: `Line one  \n\n\n\nLine two${ZERO_WIDTH_SPACE}`,
  });
  assert.deepEqual(valid, {
    success: true,
    data: { name: "Ann Lee", email: "ann@example.com", subject: "Bug report", message: "Line one\n\nLine two" },
  });

  const base = { name: "Ann", email: "ann@example.com", subject: "Hi", message: "Hello" };
  assert.equal(validateContactInput({ ...base, name: ZERO_WIDTH_SPACE }).success, false);
  assert.equal(validateContactInput({ ...base, message: `${BYTE_ORDER_MARK}\n ` }).success, false);
  assert.equal(validateContactInput({ ...base, email: "not-an-email" }).success, false);
  assert.equal(validateContactInput({ ...base, subject: undefined }).success, false);
  assert.equal(validateContactInput({ ...base, message: "x".repeat(5001) }).success, false);
});

test("only supported currency codes are accepted, ignoring spaces and letter case", () => {
  assert.equal(toSupportedCurrency("INR"), "INR");
  assert.equal(toSupportedCurrency(" usd "), "USD");
  assert.equal(toSupportedCurrency("XYZ"), null);
  assert.equal(toSupportedCurrency("RUPEES"), null);
  assert.equal(toSupportedCurrency(""), null);
  assert.equal(toSupportedCurrency(42), null);
  assert.equal(toSupportedCurrency(undefined), null);
});

test("the group API validator rejects blank and duplicate names and returns cleaned ones", () => {
  assert.equal(validateGroupInput("Trip", [ZERO_WIDTH_SPACE, "Bee"]).success, false);
  assert.equal(validateGroupInput("Trip", ["Ann", `Ann${ZERO_WIDTH_SPACE}`]).success, false);
  assert.equal(validateGroupInput(ZERO_WIDTH_SPACE, ["Ann", "Bee"]).success, false);

  const result = validateGroupInput(`  Goa${ZERO_WIDTH_SPACE}  trip `, ["Ann   Lee", "Bee"]);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.groupName, "Goa trip");
    assert.deepEqual(result.data.memberNames, ["Ann Lee", "Bee"]);
  }
});
