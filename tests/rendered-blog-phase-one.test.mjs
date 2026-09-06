import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const databasePort = 55431;
const appPort = 33210;
const siteUrl = `http://127.0.0.1:${appPort}`;
const canonicalSiteUrl = "https://www.splitcost.in";
const publishedAt = "2026-08-01T10:00:00.000Z";
const image = `${siteUrl}/editorial-cover.webp?v=1787032661587`;

function blog(slug, overrides = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(Object.keys(fixtures).length + 1).padStart(12, "0")}`,
    title: `Title for ${slug}`,
    slug,
    excerpt: `Description for ${slug}`,
    content: `# Stale Markdown title for ${slug}\n\nCurrent article body for ${slug}.`,
    cover_image: image,
    cover_alt: `Cover for ${slug}`,
    category: "Testing",
    author: "SplitCost Team",
    status: "published",
    published_at: publishedAt,
    reading_time: 1,
    no_index: false,
    is_featured: false,
    views: 0,
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: "2026-08-02T10:00:00.000Z",
    ...overrides,
  };
}

const fixtures = {};
fixtures.normal = blog("normal");
fixtures["changed-title"] = blog("changed-title", {
  title: "New canonical title",
  content: "# Old independently edited title\n\nBody.",
  updated_at: "2026-08-03T10:00:00.000Z",
});
fixtures["changed-content"] = blog("changed-content", {
  content: "# Old content H1\n\nChanged body content.",
  updated_at: "2026-08-04T10:00:00.000Z",
});
fixtures.fallback = blog("fallback", { cover_image: null, cover_alt: null });
fixtures.noindex = blog("noindex", { no_index: true });
fixtures["current-c"] = blog("current-c");
fixtures.special = blog("special", {
  title: `Special \"quotes\" & apostrophe's café Ω 漢字 </script><script>`,
  excerpt: "First line\nSecond line & more Unicode 😀",
});

const oldSlugBlogId = fixtures["current-c"].id;
let lastCmsWrite = null;

function sendJson(response, value) {
  const body = JSON.stringify(value);
  response.writeHead(200, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Content-Range": Array.isArray(value)
      ? `0-${Math.max(0, value.length - 1)}/${value.length}`
      : "0-0/1",
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null");
}

const database = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${databasePort}`);
  if (url.pathname === "/rest/v1/blog_slug_redirects") {
    const oldSlug = url.searchParams.get("old_slug")?.replace(/^eq\./, "");
    const isKnownRedirect = oldSlug === "old-a" || oldSlug === "old-b";
    sendJson(
      response,
      isKnownRedirect
        ? url.searchParams.get("select")?.includes("blogs!inner")
          ? [{ blogs: { slug: "current-c", status: "published" } }]
          : [{ blog_id: oldSlugBlogId }]
        : []
    );
    return;
  }

  if (url.pathname === "/rest/v1/blogs") {
    const selected = url.searchParams.get("select") ?? "";
    const slug = url.searchParams.get("slug")?.replace(/^eq\./, "");
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");

    if (request.method === "POST") {
      lastCmsWrite = await readJson(request);
      const created = blog(lastCmsWrite.slug, {
        ...lastCmsWrite,
        id: "00000000-0000-4000-8000-000000000099",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      fixtures[created.slug] = created;
      sendJson(response, created);
      return;
    }
    if (request.method === "PATCH" && id) {
      lastCmsWrite = await readJson(request);
      const key = Object.keys(fixtures).find((entry) => fixtures[entry].id === id);
      if (!key) return sendJson(response, {});
      fixtures[key] = { ...fixtures[key], ...lastCmsWrite, updated_at: new Date().toISOString() };
      sendJson(response, fixtures[key]);
      return;
    }
    if (request.method === "DELETE" && id) {
      const key = Object.keys(fixtures).find((entry) => fixtures[entry].id === id);
      if (key) delete fixtures[key];
      sendJson(response, []);
      return;
    }

    if (slug) {
      sendJson(response, fixtures[slug] ? [fixtures[slug]] : []);
      return;
    }
    if (id) {
      const match = Object.values(fixtures).find((entry) => entry.id === id);
      sendJson(
        response,
        match ? (selected === "slug" ? [{ slug: match.slug }] : [match]) : []
      );
      return;
    }
    if (url.searchParams.has("id") || url.searchParams.has("category")) {
      sendJson(response, []);
      return;
    }
    if (selected === "slug,updated_at,published_at") {
      const rows = Object.values(fixtures)
        .filter((entry) => !url.searchParams.has("no_index") || !entry.no_index)
        .map(({ slug: value, updated_at, published_at }) => ({
          slug: value,
          updated_at,
          published_at,
        }));
      sendJson(response, rows);
      return;
    }
    sendJson(response, []);
    return;
  }

  if (url.pathname === "/rest/v1/blog_drafts" && request.method === "DELETE") {
    sendJson(response, []);
    return;
  }

  response.writeHead(404);
  response.end();
});

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function waitForApp(child) {
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Next server exited early:\n${output}`);
    try {
      const response = await fetch(`${siteUrl}/robots.txt`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for Next server:\n${output}`);
}

function scriptsFrom(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (match) => match[1]
  );
}

function pageSchema(html) {
  const scripts = scriptsFrom(html);
  const schema = JSON.parse(scripts.at(-1));
  const posting = schema["@graph"].find((entry) => entry["@type"] === "BlogPosting");
  return { scripts, schema, posting };
}

function assertGlobalEntityIds(html) {
  const globalSchema = JSON.parse(scriptsFrom(html).at(0));
  const website = globalSchema.find((entry) => entry["@type"] === "WebSite");
  const organization = globalSchema.find((entry) => entry["@type"] === "Organization");

  assert.equal(globalSchema.filter((entry) => entry["@type"] === "WebSite").length, 1);
  assert.equal(globalSchema.filter((entry) => entry["@type"] === "Organization").length, 1);
  assert.equal(website?.["@id"], `${canonicalSiteUrl}/#website`);
  assert.equal(website?.name, "SplitCost");
  assert.equal(website?.url, canonicalSiteUrl);
  assert.deepEqual(website?.publisher, { "@id": `${canonicalSiteUrl}/#organization` });
  assert.equal(organization?.["@id"], `${canonicalSiteUrl}/#organization`);
  assert.equal(organization?.name, "SplitCost");
  assert.equal(organization?.url, canonicalSiteUrl);
  assert.equal(organization?.logo, `${canonicalSiteUrl}/android-chrome-512x512.png`);
  assert.equal(organization?.contactPoint?.["@type"], "ContactPoint");
}

function collectTypedEntities(value, type, entities = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectTypedEntities(item, type, entities);
  } else if (value && typeof value === "object") {
    if (value["@type"] === type) entities.push(value);
    for (const item of Object.values(value)) collectTypedEntities(item, type, entities);
  }
  return entities;
}

function assertNoDuplicateSiteEntities(html) {
  const schemas = scriptsFrom(html).map((script) => JSON.parse(script));
  const organizations = collectTypedEntities(schemas, "Organization");
  const websites = collectTypedEntities(schemas, "WebSite");

  assert.equal(organizations.length, 1);
  assert.equal(websites.length, 1);
  assert.equal(organizations[0]["@id"], `${canonicalSiteUrl}/#organization`);
  assert.equal(websites[0]["@id"], `${canonicalSiteUrl}/#website`);
}

function assertNoImageObjects(html) {
  const schemas = scriptsFrom(html).map((script) => JSON.parse(script));
  assert.equal(collectTypedEntities(schemas, "ImageObject").length, 0);
}

function assertSoftwareApplicationPlacement(html, expected) {
  const applications = collectTypedEntities(
    scriptsFrom(html).map((script) => JSON.parse(script)),
    "SoftwareApplication"
  );

  assert.equal(applications.length, expected ? 1 : 0);
  if (!expected) return;

  const application = applications[0];
  assert.equal(application["@id"], `${canonicalSiteUrl}/#software-application`);
  assert.equal(application.name, "SplitCost");
  assert.equal(application.url, `${canonicalSiteUrl}/en`);
  assert.equal(application.applicationCategory, "FinanceApplication");
  assert.equal(application.operatingSystem, "Web");
  assert.equal(application.inLanguage, "en");
  assert.equal(application.featureList.length, 7);
  for (const property of ["offers", "price", "priceCurrency", "downloadUrl", "installUrl", "aggregateRating", "review"]) {
    assert.equal(application[property], undefined);
  }
  assert.equal(application["@id"].includes("splitcost.app"), false);
  assert.equal(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(application["@id"]), false);
}

function assertFaqPageIdentities(html, pageUrl) {
  const faqPages = collectTypedEntities(
    scriptsFrom(html).map((script) => JSON.parse(script)),
    "FAQPage"
  );
  for (const faqPage of faqPages) {
    assert.equal(faqPage["@id"], `${pageUrl}#faq`);
    assert.equal(faqPage.url, pageUrl);
  }
}

function assertPageWebsiteReference(html) {
  const schema = JSON.parse(scriptsFrom(html).at(-1));
  const entities = schema["@graph"] ?? [schema];
  const page = entities.find((entry) => ["WebPage", "CollectionPage", "ContactPage"].includes(entry["@type"]));

  assert(page);
  assert.deepEqual(page.isPartOf, { "@id": `${canonicalSiteUrl}/#website` });
}

function assertBreadcrumbList(breadcrumb, pageUrl, finalName) {
  assert.equal(breadcrumb?.["@type"], "BreadcrumbList");
  assert.equal(breadcrumb?.["@id"], `${pageUrl}#breadcrumb`);
  assert.deepEqual(
    breadcrumb?.itemListElement?.map((item) => item.position),
    Array.from({ length: breadcrumb?.itemListElement?.length ?? 0 }, (_, index) => index + 1)
  );
  assert.equal(breadcrumb?.itemListElement?.at(-1)?.item, pageUrl);
  assert.equal(breadcrumb?.itemListElement?.at(-1)?.name, finalName);
  for (const item of breadcrumb?.itemListElement ?? []) {
    assert.equal(item.item.startsWith(`${canonicalSiteUrl}/`), true);
    assert.equal(/[?#]/.test(item.item), false);
  }
}

function assertBlogBreadcrumbGraph(schema, fixture) {
  const graph = schema["@graph"];
  const canonicalUrl = `${canonicalSiteUrl}/en/blog/${fixture.slug}`;
  const posting = graph.find((entry) => entry["@type"] === "BlogPosting");
  const webPages = graph.filter((entry) => entry["@type"] === "WebPage");
  const breadcrumbs = graph.filter((entry) => entry["@type"] === "BreadcrumbList");

  assert.equal(webPages.length, 1);
  assert.equal(breadcrumbs.length, 1);
  assert.deepEqual(posting.mainEntityOfPage, { "@id": `${canonicalUrl}#webpage` });
  assert.equal(posting.breadcrumb, undefined);
  assert.equal(webPages[0]["@id"], `${canonicalUrl}#webpage`);
  assert.equal(webPages[0].url, canonicalUrl);
  assert.deepEqual(webPages[0].isPartOf, { "@id": `${canonicalSiteUrl}/#website` });
  assert.deepEqual(webPages[0].breadcrumb, { "@id": `${canonicalUrl}#breadcrumb` });
  assertBreadcrumbList(breadcrumbs[0], canonicalUrl, fixture.title);
}

function assertBlogImageGraph(schema, fixture) {
  const graph = schema["@graph"];
  const posting = graph.find((entry) => entry["@type"] === "BlogPosting");
  const images = graph.filter((entry) => entry["@type"] === "ImageObject");

  if (!fixture.cover_image) {
    assert.equal(images.length, 0);
    assert.equal(typeof posting.image, "string");
    assert.equal(new URL(posting.image).pathname.endsWith("/og-image.png"), true);
    return;
  }

  assert.equal(images.length, 1);
  assert.deepEqual(posting.image, { "@id": `${fixture.cover_image}#image` });
  assert.equal(images[0]["@id"], `${fixture.cover_image}#image`);
  assert.equal(images[0].url, fixture.cover_image);
  assert.equal(images[0].contentUrl, fixture.cover_image);
  assert.equal(images[0].caption, fixture.cover_alt);
  assert.equal(images[0].representativeOfPage, true);
}

function assertPageBreadcrumb(html, pageUrl, finalName) {
  const schema = JSON.parse(scriptsFrom(html).at(-1));
  const entities = schema["@graph"] ?? [schema];
  const page = entities.find((entry) => ["WebPage", "CollectionPage", "ContactPage"].includes(entry["@type"]));

  assert(page);
  assertBreadcrumbList(page.breadcrumb, pageUrl, finalName);
}

function getCanonical(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
}

function getRobots(html) {
  return html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? "";
}

function getH1(html) {
  return html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
}

function decodeHtmlText(value) {
  return value
    ?.replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function assertPosting(posting, fixture) {
  assert.equal(posting.headline, fixture.title);
  assert.equal(posting.datePublished, publishedAt);
  assert.equal(posting.dateModified, fixture.updated_at);
  if (fixture.cover_image) {
    assert.equal(posting.thumbnailUrl, fixture.cover_image);
  } else {
    assert.equal(new URL(posting.thumbnailUrl).pathname.endsWith("/og-image.png"), true);
  }
  assert.deepEqual(posting.author, { "@id": `${canonicalSiteUrl}/#organization` });
  assert.equal(posting.author["@type"], undefined);
  const canonicalUrl = `${canonicalSiteUrl}/en/blog/${fixture.slug}`;
  assert.equal(posting["@id"], `${canonicalUrl}#blog-posting`);
  assert.deepEqual(posting.publisher, { "@id": `${canonicalSiteUrl}/#organization` });
  const contentH1 = fixture.content.match(/^#\s+(.+)$/m)?.[1];
  if (contentH1) assert.equal(posting.articleBody.includes(contentH1), false);
}

await listen(database, databasePort);
const next = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_URL: `http://127.0.0.1:${databasePort}`,
      SUPABASE_PUBLISHABLE_KEY: "render-test-key",
      SUPABASE_SERVICE_ROLE_KEY: "render-test-service-role-key",
      ADMIN_LOGIN_ID: "cms-admin",
      ADMIN_LOGIN_PASSWORD: "render-test-password",
      ADMIN_SESSION_SECRET: "render-test-session-secret-with-sufficient-entropy",
      NEXT_PUBLIC_SITE_URL: siteUrl,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

try {
  await waitForApp(next);

  for (const slug of ["normal", "changed-title", "changed-content", "fallback"]) {
    const fixture = fixtures[slug];
    const response = await fetch(`${siteUrl}/en/blog/${slug}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(getCanonical(html), `${canonicalSiteUrl}/en/blog/${slug}`);
    assert.equal(decodeHtmlText(getH1(html)), fixture.title);
    assert.equal(getRobots(html).includes("noindex"), false);
    assertGlobalEntityIds(html);
    assertNoDuplicateSiteEntities(html);
    const { scripts, posting } = pageSchema(html);
    assert.equal(scripts.length, 2);
    assertPosting(posting, fixture);
    assertBlogBreadcrumbGraph(pageSchema(html).schema, fixture);
    assertBlogImageGraph(pageSchema(html).schema, fixture);
  }

  const noindexResponse = await fetch(`${siteUrl}/en/blog/noindex`);
  const noindexHtml = await noindexResponse.text();
  assert.equal(noindexResponse.status, 200);
  assert.equal(getCanonical(noindexHtml), `${canonicalSiteUrl}/en/blog/noindex`);
  assert.equal(decodeHtmlText(getH1(noindexHtml)), fixtures.noindex.title);
  assert.equal(getRobots(noindexHtml).includes("noindex"), true);
  assertGlobalEntityIds(noindexHtml);
  assertNoDuplicateSiteEntities(noindexHtml);
  assert.equal(scriptsFrom(noindexHtml).length, 1);

  for (const path of ["/en", "/es", "/pt", "/en/compare", "/es/compare", "/pt/compare", "/en/compare/splitwise", "/en/use-cases/travel", "/es/use-cases/travel", "/en/privacy", "/es/privacy", "/pt/privacy", "/en/terms", "/en/contact", "/en/resources"]) {
    const response = await fetch(`${siteUrl}${path}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assertGlobalEntityIds(html);
    assertNoDuplicateSiteEntities(html);
    assertNoImageObjects(html);
    assertSoftwareApplicationPlacement(html, path === "/en");
    assertFaqPageIdentities(html, getCanonical(html));
    if (!["/en", "/es", "/pt"].includes(path)) {
      assertPageWebsiteReference(html);
      const finalName = {
        "/en/compare": "Compare",
        "/es/compare": "Comparar",
        "/pt/privacy": "Política de privacidade",
      }[path];
      if (finalName) assertPageBreadcrumb(html, `${canonicalSiteUrl}${path}`, finalName);
    }
  }

  const sitemap = await (await fetch(`${siteUrl}/sitemap.xml`)).text();
  assert.equal(sitemap.includes("/en/blog/normal"), true);
  assert.equal(sitemap.includes("/en/blog/noindex"), false);

  for (const oldSlug of ["old-a", "old-b"]) {
    const response = await fetch(`${siteUrl}/en/blog/${oldSlug}`, {
      redirect: "manual",
    });
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location")).pathname, "/en/blog/current-c");
    assert.equal(
      response.headers.get("cache-control"),
      "private, no-store, max-age=0, must-revalidate"
    );
  }
  const currentResponse = await fetch(`${siteUrl}/en/blog/current-c`);
  const currentHtml = await currentResponse.text();
  assert.equal(currentResponse.status, 200);
  assert.equal(getCanonical(currentHtml), `${canonicalSiteUrl}/en/blog/current-c`);
  assert.equal(decodeHtmlText(getH1(currentHtml)), fixtures["current-c"].title);
  assertPosting(pageSchema(currentHtml).posting, fixtures["current-c"]);

  const specialResponse = await fetch(`${siteUrl}/en/blog/special`);
  const specialHtml = await specialResponse.text();
  const special = pageSchema(specialHtml);
  assert.equal(specialResponse.status, 200);
  assert.equal(getCanonical(specialHtml), `${canonicalSiteUrl}/en/blog/special`);
  assert.equal(decodeHtmlText(getH1(specialHtml)), fixtures.special.title);
  assert.equal(getRobots(specialHtml).includes("noindex"), false);
  assert.equal(special.scripts.length, 2);
  assert.equal(special.scripts.at(-1).includes("<"), false);
  assertGlobalEntityIds(specialHtml);
  assertNoDuplicateSiteEntities(specialHtml);
  assertPosting(special.posting, fixtures.special);
  assertBlogBreadcrumbGraph(special.schema, fixtures.special);
  assertBlogImageGraph(special.schema, fixtures.special);

  const unauthorizedCreate = await fetch(`${siteUrl}/api/blogs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Unauthorized" }),
  });
  assert.equal(unauthorizedCreate.status, 401);

  const loginResponse = await fetch(`${siteUrl}/api/admin-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId: "cms-admin", password: "render-test-password" }),
  });
  assert.equal(loginResponse.status, 200);
  const adminCookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0];
  assert(adminCookie);

  const cmsPayload = {
    title: "Authorized CMS post",
    slug: "authorized-cms-post",
    excerpt: "Authorized description",
    content: "Body",
    cover_image: null,
    cover_alt: null,
    category: null,
    author: "SplitCost Team",
    status: "draft",
    updated_at: "2000-01-01T00:00:00Z",
    published_at: "2000-01-01T00:00:00Z",
    created_at: "2000-01-01T00:00:00Z",
    views: 999,
  };
  const createResponse = await fetch(`${siteUrl}/api/blogs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify(cmsPayload),
  });
  assert.equal(createResponse.status, 200);
  const created = await createResponse.json();
  assert.equal("updated_at" in lastCmsWrite, false);
  assert.equal("created_at" in lastCmsWrite, false);
  assert.equal("views" in lastCmsWrite, false);
  assert.equal(lastCmsWrite.published_at, null);

  const publishResponse = await fetch(`${siteUrl}/api/blogs/${created.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ ...cmsPayload, status: "published" }),
  });
  assert.equal(publishResponse.status, 200);
  assert.equal(lastCmsWrite.status, "published");
  assert.notEqual(lastCmsWrite.published_at, "2000-01-01T00:00:00Z");

  const deleteResponse = await fetch(`${siteUrl}/api/blogs/${created.id}`, {
    method: "DELETE",
    headers: { cookie: adminCookie },
  });
  assert.equal(deleteResponse.status, 200);

  console.log(
    JSON.stringify({
      normal: "200/indexable/schema-valid",
      changedTitle: "200/H1-headline-match",
      changedContent: "200/dateModified-preserved",
      noindex: "200/noindex/not-in-sitemap/no-article-schema",
      slugHistory: "old-a-and-old-b-307-no-store-direct-to-current-c",
      specialCharacters: "200/script-safe/JSON-round-trip",
      cmsAuthorization: "public-denied/authorized-create-publish-delete",
    })
  );
} finally {
  next.kill();
  await close(database);
}
