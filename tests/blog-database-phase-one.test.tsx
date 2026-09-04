import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const phaseOneMigrationUrl = new URL(
  "../supabase/migrations/20260904180000_fix_blog_schema_phase_one.sql",
  import.meta.url
);
const phaseOneAMigrationUrl = new URL(
  "../supabase/migrations/20260904190000_harden_blog_publishing_phase_one_a.sql",
  import.meta.url
);

async function createDatabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE TYPE public.blog_status AS ENUM ('draft', 'published');
    CREATE TABLE public.blogs (
      id uuid NOT NULL,
      title text,
      slug text UNIQUE,
      excerpt text,
      content text DEFAULT '',
      cover_image text,
      cover_alt text,
      category text,
      author text DEFAULT 'SplitCost Team',
      status public.blog_status NOT NULL DEFAULT 'draft',
      published_at timestamp with time zone,
      reading_time integer NOT NULL DEFAULT 1,
      views integer NOT NULL DEFAULT 0,
      no_index boolean NOT NULL DEFAULT false,
      is_featured boolean NOT NULL DEFAULT false,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT blogs_pkey PRIMARY KEY (id)
    );
    CREATE TABLE public.blog_drafts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE
    );
    CREATE TABLE public.blog_categories (id uuid PRIMARY KEY);
    CREATE SCHEMA storage;
    CREATE TABLE storage.objects (id uuid PRIMARY KEY, bucket_id text);
    ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.blog_drafts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow all access to blogs" ON public.blogs
      FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all access to blog drafts" ON public.blog_drafts
      FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all access to blog categories" ON public.blog_categories
      FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow blog image uploads" ON storage.objects FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow blog image updates" ON storage.objects FOR UPDATE USING (true);
    CREATE POLICY "Allow blog image deletes" ON storage.objects FOR DELETE USING (true);
    GRANT ALL ON public.blogs, public.blog_drafts, public.blog_categories TO anon, authenticated;
    CREATE OR REPLACE FUNCTION public.set_blog_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = now();
      IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
        NEW.published_at = now();
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER set_blog_updated_at
    BEFORE UPDATE ON public.blogs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_blog_updated_at();
  `);
  await db.exec(await readFile(fileURLToPath(phaseOneMigrationUrl), "utf8"));
  await db.exec("GRANT ALL ON public.blog_slug_redirects TO anon, authenticated");
  await db.exec(await readFile(fileURLToPath(phaseOneAMigrationUrl), "utf8"));
  return db;
}

async function getDates(db: PGlite, id: string) {
  const result = await db.query<{ updated_at: number; published_at: number }>(
    `SELECT
       extract(epoch FROM updated_at)::double precision AS updated_at,
       extract(epoch FROM published_at)::double precision AS published_at
     FROM public.blogs WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

test("view tracking preserves updated_at while editorial changes update it", async () => {
  const db = await createDatabase();
  const id = "00000000-0000-4000-8000-000000000001";
  const initialModified = "2026-01-01 00:00:00+00";
  const initialPublished = "2025-12-01 00:00:00+00";
  const initialModifiedEpoch = Date.parse(initialModified) / 1000;
  const initialPublishedEpoch = Date.parse(initialPublished) / 1000;

  await db.query(
    `INSERT INTO public.blogs
      (id, title, slug, excerpt, content, author, category, cover_image, status, published_at, updated_at)
     VALUES ($1, 'Title A', 'slug-a', 'Excerpt', 'Body A', 'Author A', 'Category A', '/a.webp',
       'published', $2, $3)`,
    [id, initialPublished, initialModified]
  );

  await db.query("UPDATE public.blogs SET views = views + 1 WHERE id = $1", [id]);
  assert.deepEqual(await getDates(db, id), {
    updated_at: initialModifiedEpoch,
    published_at: initialPublishedEpoch,
  });

  await db.query("UPDATE public.blogs SET views = views + 1 WHERE id = $1", [id]);
  assert.deepEqual(await getDates(db, id), {
    updated_at: initialModifiedEpoch,
    published_at: initialPublishedEpoch,
  });

  const editorialUpdates = [
    ["published_at", "2025-12-02 00:00:00+00"],
    ["content", "Body B"],
    ["title", "Title B"],
    ["excerpt", "Excerpt B"],
    ["cover_image", "/b.webp"],
    ["cover_alt", "Cover B"],
    ["author", "Author B"],
    ["category", "Category B"],
    ["slug", "slug-b"],
    ["reading_time", 2],
    ["no_index", true],
    ["is_featured", true],
  ] as const;

  for (const [column, value] of editorialUpdates) {
    const before = await getDates(db, id);
    await new Promise((resolve) => setTimeout(resolve, 2));
    await db.query(`UPDATE public.blogs SET ${column} = $1 WHERE id = $2`, [value, id]);
    const after = await getDates(db, id);
    assert.notEqual(after.updated_at, before.updated_at, `${column} must update updated_at`);
    assert.equal(after.published_at, Date.parse("2025-12-02 00:00:00+00") / 1000);
  }

  const beforeRepublish = await getDates(db, id);
  await db.query("UPDATE public.blogs SET status = 'published' WHERE id = $1", [id]);
  assert.deepEqual(await getDates(db, id), beforeRepublish);

  await db.close();
});

test("published slug history resolves every prior slug directly to the current slug", async () => {
  const db = await createDatabase();
  const id = "00000000-0000-4000-8000-000000000001";

  await db.query(
    `INSERT INTO public.blogs
      (id, title, slug, excerpt, content, status, published_at)
     VALUES ($1, 'Title', 'slug-a', 'Excerpt', 'Body', 'published', now())`,
    [id]
  );
  await db.query("UPDATE public.blogs SET slug = 'slug-b' WHERE id = $1", [id]);
  await db.query("UPDATE public.blogs SET slug = 'slug-c' WHERE id = $1", [id]);

  const redirects = await db.query<{ old_slug: string; destination: string }>(
    `SELECT redirect.old_slug, blog.slug AS destination
     FROM public.blog_slug_redirects AS redirect
     JOIN public.blogs AS blog ON blog.id = redirect.blog_id
     ORDER BY redirect.old_slug`
  );
  assert.deepEqual(redirects.rows, [
    { old_slug: "slug-a", destination: "slug-c" },
    { old_slug: "slug-b", destination: "slug-c" },
  ]);

  await assert.rejects(
    db.query(
      `INSERT INTO public.blogs
        (id, title, slug, excerpt, content, status, published_at)
       VALUES ('00000000-0000-4000-8000-000000000002', 'Other', 'slug-a', 'Excerpt', 'Body', 'published', now())`
    )
  );

  await db.query(
    `INSERT INTO public.blogs
      (id, title, slug, excerpt, content, status)
     VALUES ('00000000-0000-4000-8000-000000000003', 'Draft', 'slug-a', 'Excerpt', 'Body', 'draft')`
  );
  await assert.rejects(
    db.query(
      "UPDATE public.blogs SET status = 'published' WHERE id = '00000000-0000-4000-8000-000000000003'"
    )
  );

  await db.close();
});

test("views never establish publication metadata", async () => {
  const db = await createDatabase();
  const publishedId = "00000000-0000-4000-8000-000000000010";
  const draftId = "00000000-0000-4000-8000-000000000011";

  await db.query(
    `INSERT INTO public.blogs (id, title, slug, status, published_at)
     VALUES ($1, 'Malformed published', 'malformed-published', 'published', NULL),
            ($2, 'Draft', 'draft-post', 'draft', NULL)`,
    [publishedId, draftId]
  );
  await db.query("UPDATE public.blogs SET views = views + 1 WHERE id = $1", [publishedId]);
  await db.query("UPDATE public.blogs SET views = views + 1 WHERE id = $1", [draftId]);

  const beforePublish = await db.query<{ id: string; published_at: string | null }>(
    "SELECT id, published_at::text FROM public.blogs ORDER BY id"
  );
  assert.deepEqual(beforePublish.rows, [
    { id: publishedId, published_at: null },
    { id: draftId, published_at: null },
  ]);

  await db.query("UPDATE public.blogs SET status = 'published' WHERE id = $1", [draftId]);
  const afterPublish = await db.query<{ published_at: string | null }>(
    "SELECT published_at::text FROM public.blogs WHERE id = $1",
    [draftId]
  );
  assert.notEqual(afterPublish.rows[0].published_at, null);

  const publishedAt = afterPublish.rows[0].published_at;
  await db.query("UPDATE public.blogs SET views = views + 1 WHERE id = $1", [draftId]);
  const afterView = await db.query<{ published_at: string | null }>(
    "SELECT published_at::text FROM public.blogs WHERE id = $1",
    [draftId]
  );
  assert.equal(afterView.rows[0].published_at, publishedAt);
  await db.close();
});

test("slug reversion remains direct and reserves deleted public URLs", async () => {
  const db = await createDatabase();
  const id = "00000000-0000-4000-8000-000000000020";

  await db.query(
    `INSERT INTO public.blogs (id, title, slug, status, published_at)
     VALUES ($1, 'Title', 'slug-a', 'published', now())`,
    [id]
  );
  await db.query("UPDATE public.blogs SET slug = 'slug-b' WHERE id = $1", [id]);
  await db.query("UPDATE public.blogs SET slug = 'slug-c' WHERE id = $1", [id]);
  await db.query("UPDATE public.blogs SET slug = 'slug-a' WHERE id = $1", [id]);

  const activeHistory = await db.query<{ old_slug: string; destination: string | null }>(
    `SELECT redirect.old_slug, blog.slug AS destination
     FROM public.blog_slug_redirects AS redirect
     LEFT JOIN public.blogs AS blog ON blog.id = redirect.blog_id
     ORDER BY redirect.old_slug`
  );
  assert.deepEqual(activeHistory.rows, [
    { old_slug: "slug-b", destination: "slug-a" },
    { old_slug: "slug-c", destination: "slug-a" },
  ]);

  await db.query("DELETE FROM public.blogs WHERE id = $1", [id]);
  const tombstones = await db.query<{ old_slug: string; blog_id: string | null }>(
    "SELECT old_slug, blog_id FROM public.blog_slug_redirects ORDER BY old_slug"
  );
  assert.deepEqual(tombstones.rows, [
    { old_slug: "slug-a", blog_id: null },
    { old_slug: "slug-b", blog_id: null },
    { old_slug: "slug-c", blog_id: null },
  ]);

  await assert.rejects(
    db.query(
      `INSERT INTO public.blogs (id, title, slug, status, published_at)
       VALUES ('00000000-0000-4000-8000-000000000021', 'Unrelated', 'slug-a', 'published', now())`
    )
  );
  await db.close();
});

test("drafts may stage historical slugs but cannot publish them", async () => {
  const db = await createDatabase();
  await db.exec(`
    INSERT INTO public.blogs (id, title, slug, status, published_at)
    VALUES ('00000000-0000-4000-8000-000000000030', 'A', 'slug-a', 'published', now());
    UPDATE public.blogs SET slug = 'slug-b'
    WHERE id = '00000000-0000-4000-8000-000000000030';
    INSERT INTO public.blogs (id, title, slug, status)
    VALUES ('00000000-0000-4000-8000-000000000031', 'B', 'slug-a', 'draft');
  `);

  await assert.rejects(
    db.query(
      "UPDATE public.blogs SET status = 'published' WHERE id = '00000000-0000-4000-8000-000000000031'"
    )
  );
  await db.close();
});

test("public database roles can read published blogs but cannot mutate CMS data", async () => {
  const db = await createDatabase();
  await db.exec(`
    INSERT INTO public.blogs (id, title, slug, status, published_at)
    VALUES ('00000000-0000-4000-8000-000000000040', 'Published', 'published', 'published', now()),
           ('00000000-0000-4000-8000-000000000041', 'Draft', 'draft', 'draft', NULL);
    SET ROLE anon;
  `);

  const visible = await db.query<{ slug: string }>("SELECT slug FROM public.blogs");
  assert.deepEqual(visible.rows, [{ slug: "published" }]);
  await assert.rejects(
    db.query(
      `INSERT INTO public.blogs (id, title, slug, status)
       VALUES ('00000000-0000-4000-8000-000000000042', 'Injected', 'injected', 'draft')`
    )
  );
  await assert.rejects(
    db.query("UPDATE public.blogs SET title = 'Injected' WHERE slug = 'published'")
  );
  await assert.rejects(db.query("DELETE FROM public.blogs WHERE slug = 'published'"));
  await assert.rejects(
    db.query(
      "INSERT INTO public.blog_slug_redirects (old_slug, blog_id) VALUES ('hijack', NULL)"
    )
  );

  await db.exec("RESET ROLE");
  await db.exec("SET ROLE authenticated");
  await assert.rejects(
    db.query("UPDATE public.blogs SET title = 'Unauthorized user' WHERE slug = 'published'")
  );
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.blogs SET title = 'Authorized edit' WHERE slug = 'published'");
  await db.query("DELETE FROM public.blogs WHERE slug = 'draft'");
  await db.close();
});

test("direct redirect writes cannot contradict a current published slug", async () => {
  const db = await createDatabase();
  await db.exec(`
    INSERT INTO public.blogs (id, title, slug, status, published_at)
    VALUES ('00000000-0000-4000-8000-000000000050', 'A', 'owned-slug', 'published', now()),
           ('00000000-0000-4000-8000-000000000051', 'B', 'other-slug', 'published', now());
  `);

  await assert.rejects(
    db.query(
      `INSERT INTO public.blog_slug_redirects (old_slug, blog_id)
       VALUES ('owned-slug', '00000000-0000-4000-8000-000000000051')`
    )
  );
  await db.close();
});
