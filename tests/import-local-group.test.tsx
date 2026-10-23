import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL(
  "../supabase/migrations/20261015120000_import_local_group.sql",
  import.meta.url
);

// The tables the import writes to, as the earlier migrations leave them.
async function createDatabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE TYPE split_type_enum AS ENUM ('custom', 'equal', 'percentage');
    CREATE TABLE public.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      currency text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz,
      revision bigint NOT NULL DEFAULT 1
    );
    CREATE TABLE public.group_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role text,
      joined_at timestamptz DEFAULT now(),
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.expenses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
      description text NOT NULL,
      notes text CHECK (notes IS NULL OR char_length(notes) <= 10000),
      amount numeric NOT NULL,
      currency text NOT NULL,
      paid_by_user_id uuid REFERENCES public.users(id),
      split_type split_type_enum NOT NULL,
      category text NOT NULL,
      subcategory text NOT NULL,
      date date NOT NULL,
      attachment_data_url text,
      revision bigint NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.expense_participants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.users(id),
      share_amount numeric,
      share_percent numeric
    );
    CREATE TABLE public.expense_payers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.users(id),
      amount numeric(12,2) NOT NULL,
      UNIQUE (expense_id, user_id)
    );
  `);
  await db.exec(await readFile(fileURLToPath(migrationUrl), "utf8"));
  return db;
}

const GROUP = "11111111-1111-4111-8111-111111111111";
const MEERA = "22222222-2222-4222-8222-222222222222";
const KABIR = "33333333-3333-4333-8333-333333333333";
const DINNER = "44444444-4444-4444-8444-444444444444";
const SETTLE = "55555555-5555-4555-8555-555555555555";

const members = [
  { id: MEERA, name: "Meera" },
  { id: KABIR, name: "Kabir" },
];

const expenses = [
  {
    id: DINNER,
    description: "Dinner",
    notes: null,
    amount: 900,
    paidByUserId: MEERA,
    payers: [],
    splitType: "equal",
    category: "food",
    subcategory: "restaurant",
    date: "2026-10-14",
    participants: [
      { userId: MEERA, amount: 450, percent: null },
      { userId: KABIR, amount: 450, percent: null },
    ],
    createdAt: "2026-10-14T10:00:00.000Z",
    updatedAt: "2026-10-14T10:00:00.000Z",
  },
  {
    id: SETTLE,
    description: "Settlement",
    notes: null,
    amount: 450,
    paidByUserId: null,
    payers: [{ userId: KABIR, amount: 450 }],
    splitType: "equal",
    category: "settlement",
    subcategory: "settle_up",
    date: "2026-10-14",
    participants: [{ userId: MEERA, amount: 450, percent: null }],
    // From a device whose clock runs ahead: must not land in the future.
    createdAt: "2999-01-01T00:00:00.000Z",
    updatedAt: "2999-01-01T00:00:00.000Z",
  },
];

function runImport(db: PGlite, hash: string, overrides: { expenses?: unknown[]; members?: unknown[] } = {}) {
  return db.query<{ result: string }>(
    `SELECT public.import_local_group($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb) AS result`,
    [
      GROUP,
      hash,
      "Goa trip",
      "INR",
      "2026-10-14T09:00:00.000Z",
      JSON.stringify(overrides.members ?? members),
      JSON.stringify(overrides.expenses ?? expenses),
    ]
  );
}

async function count(db: PGlite, table: string) {
  const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.${table}`);
  return rows[0].n;
}

test("imports a group with its members, expenses and settlements in one go", async () => {
  const db = await createDatabase();
  const { rows } = await runImport(db, "hash-a");
  assert.equal(rows[0].result, "created");

  assert.equal(await count(db, "groups"), 1);
  assert.equal(await count(db, "users"), 2);
  assert.equal(await count(db, "group_members"), 2);
  assert.equal(await count(db, "expenses"), 2);
  assert.equal(await count(db, "expense_participants"), 3);
  assert.equal(await count(db, "expense_payers"), 1);

  const settlement = await db.query<{ paid_by_user_id: string | null; created_at: Date }>(
    `SELECT paid_by_user_id, created_at FROM public.expenses WHERE id = $1`,
    [SETTLE]
  );
  assert.equal(settlement.rows[0].paid_by_user_id, null);
  assert.ok(new Date(settlement.rows[0].created_at).getTime() <= Date.now(), "future time is capped at now");
});

test("a resend of the same snapshot succeeds without writing again", async () => {
  const db = await createDatabase();
  await runImport(db, "hash-a");
  const { rows } = await runImport(db, "hash-a");
  assert.equal(rows[0].result, "already_imported");
  assert.equal(await count(db, "groups"), 1);
  assert.equal(await count(db, "expenses"), 2);
});

test("the same id with different content is refused and changes nothing", async () => {
  const db = await createDatabase();
  await runImport(db, "hash-a");
  await assert.rejects(runImport(db, "hash-b", { expenses: [] }), /IMPORT_CONFLICT/);
  assert.equal(await count(db, "expenses"), 2);
});

test("a failure part-way rolls back the whole import, so it can be sent again", async () => {
  const db = await createDatabase();
  // The second expense reuses the first one's id: its insert fails after the
  // group, members and first expense were written.
  const broken = [expenses[0], { ...expenses[1], id: DINNER }];
  await assert.rejects(runImport(db, "hash-a", { expenses: broken }));

  assert.equal(await count(db, "group_imports"), 0);
  assert.equal(await count(db, "groups"), 0);
  assert.equal(await count(db, "users"), 0);
  assert.equal(await count(db, "expenses"), 0);

  const { rows } = await runImport(db, "hash-a");
  assert.equal(rows[0].result, "created");
});

test("a member id already used elsewhere is refused instead of joining that user", async () => {
  const db = await createDatabase();
  await db.query(`INSERT INTO public.users (id, name) VALUES ($1, 'Someone else')`, [MEERA]);
  await assert.rejects(runImport(db, "hash-a"));
  assert.equal(await count(db, "groups"), 0);
  assert.equal(await count(db, "group_imports"), 0);
});
