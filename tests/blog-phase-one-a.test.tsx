import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isAuthorizedAdminRequest,
  verifyAdminCredentials,
  verifyAdminSessionToken,
} from "../src/lib/admin-auth";
import { normalizeBlogInput } from "../src/lib/blog/input";
import { BlogMarkdown } from "../src/components/blog/BlogArticle";
import { getCanonicalBlogUrl } from "../src/lib/seo";
import { POST as createBlogRoute } from "../src/app/api/blogs/route";
import {
  DELETE as deleteBlogRoute,
  PUT as updateBlogRoute,
} from "../src/app/api/blogs/[id]/route";

function withAdminEnvironment<T>(callback: () => T) {
  const previous = {
    id: process.env.ADMIN_LOGIN_ID,
    password: process.env.ADMIN_LOGIN_PASSWORD,
    secret: process.env.ADMIN_SESSION_SECRET,
  };
  process.env.ADMIN_LOGIN_ID = "cms-admin";
  process.env.ADMIN_LOGIN_PASSWORD = "test-password";
  process.env.ADMIN_SESSION_SECRET = "test-session-secret-with-sufficient-entropy";
  try {
    return callback();
  } finally {
    if (previous.id === undefined) delete process.env.ADMIN_LOGIN_ID;
    else process.env.ADMIN_LOGIN_ID = previous.id;
    if (previous.password === undefined) delete process.env.ADMIN_LOGIN_PASSWORD;
    else process.env.ADMIN_LOGIN_PASSWORD = previous.password;
    if (previous.secret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = previous.secret;
  }
}

test("admin credentials create a tamper-resistant expiring server session", () => {
  withAdminEnvironment(() => {
    assert.equal(verifyAdminCredentials("cms-admin", "test-password"), true);
    assert.equal(verifyAdminCredentials("cms-admin", "wrong"), false);

    const now = Date.UTC(2026, 8, 4, 12);
    const token = createAdminSessionToken(now);
    assert.equal(verifyAdminSessionToken(token, now), true);
    assert.equal(verifyAdminSessionToken(`${token.slice(0, -1)}0`, now), false);
    assert.equal(verifyAdminSessionToken(token, now + 9 * 60 * 60 * 1000), false);

    const request = new Request("https://www.splitcost.in/api/blogs", {
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}` },
    });
    assert.equal(isAuthorizedAdminRequest(request), true);
  });
});

test("unauthenticated blog creation is rejected before request data is processed", async () => {
  const response = await createBlogRoute(
    new Request("https://www.splitcost.in/api/blogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unauthorized" }),
    })
  );
  assert.equal(response.status, 401);

  const context = { params: { id: "00000000-0000-4000-8000-000000000001" } };
  const updateResponse = await updateBlogRoute(
    new Request("https://www.splitcost.in/api/blogs/ignored", {
      method: "PUT",
      body: JSON.stringify({ status: "published" }),
    }),
    context
  );
  assert.equal(updateResponse.status, 401);

  const deleteResponse = await deleteBlogRoute(
    new Request("https://www.splitcost.in/api/blogs/ignored", { method: "DELETE" }),
    context
  );
  assert.equal(deleteResponse.status, 401);
});

test("blog input strips every server-managed and unknown field", () => {
  const input = normalizeBlogInput({
    title: "  Canonical title  ",
    slug: "Canonical Title",
    excerpt: "  Description  ",
    content: "Body",
    cover_image: null,
    cover_alt: null,
    category: null,
    author: null,
    status: "published",
    updated_at: "2000-01-01T00:00:00Z",
    published_at: "2000-01-01T00:00:00Z",
    created_at: "2000-01-01T00:00:00Z",
    id: "attacker-controlled",
    views: 999999,
    blog_slug_redirects: [{ old_slug: "hijacked" }],
    arbitrary: "value",
  });

  assert.deepEqual(input, {
    title: "Canonical title",
    slug: "canonical-title",
    excerpt: "Description",
    content: "Body",
    cover_image: null,
    cover_alt: null,
    category: null,
    author: "SplitCost Team",
    status: "published",
    reading_time: 1,
    no_index: false,
    is_featured: false,
  });
  assert.equal("updated_at" in input, false);
  assert.equal("published_at" in input, false);
});

test("blog Markdown cannot emit additional H1 elements", () => {
  const html = renderToStaticMarkup(
    <BlogMarkdown
      content={[
        "# First content heading",
        "## Normal H2",
        "### Normal H3",
        "# Second content heading",
        "<h1>Raw HTML content heading</h1>",
        "```md",
        "# Code heading",
        "```",
        "Text containing # inline text.",
      ].join("\n\n")}
    />
  );

  assert.equal(/<h1[\s>]/.test(html), false);
  assert.equal((html.match(/<h2[\s>]/g) ?? []).length, 4);
  assert.equal((html.match(/<h3[\s>]/g) ?? []).length, 1);
  assert.match(html, /<code class="language-md">\s*# Code heading/);
  assert.match(html, /Text containing # inline text/);
});

test("blog Markdown without content H1 preserves H2 and H3", () => {
  const html = renderToStaticMarkup(<BlogMarkdown content={"## H2\n\n### H3"} />);
  assert.equal(/<h1[\s>]/.test(html), false);
  assert.equal((html.match(/<h2[\s>]/g) ?? []).length, 1);
  assert.equal((html.match(/<h3[\s>]/g) ?? []).length, 1);
});

test("CMS blog URLs use the configured canonical host and English route", () => {
  assert.equal(
    getCanonicalBlogUrl("canonical-post"),
    "https://www.splitcost.in/en/blog/canonical-post"
  );
});
