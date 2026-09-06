import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BlogArticleHeader } from "../src/components/blog/BlogArticleHeader";
import {
  buildBlogStructuredData,
  buildPublicBlogStructuredData,
  serializeStructuredDataForHtml,
} from "../src/lib/blog/schema";
import {
  getBlogPostingId,
  getBreadcrumbId,
  getImageObjectId,
  getOrganizationId,
  getWebPageId,
  getWebsiteId,
} from "../src/lib/schema-identity";
import type { Blog } from "../src/lib/blog/types";

function makeBlog(overrides: Partial<Blog> = {}): Blog {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Canonical article title",
    slug: "canonical-article-title",
    excerpt: "A representative article description.",
    content: "# Independently edited Markdown H1\n\nArticle body.",
    cover_image: "/og-image.png",
    cover_alt: "Article cover",
    category: "Testing",
    author: "SplitCost Team",
    status: "published",
    published_at: "2026-09-01T10:00:00.000Z",
    reading_time: 1,
    no_index: false,
    is_featured: false,
    views: 0,
    created_at: "2026-09-01T09:00:00.000Z",
    updated_at: "2026-09-02T10:00:00.000Z",
    ...overrides,
  };
}

function getBlogPosting(schema: ReturnType<typeof buildBlogStructuredData>) {
  assert.equal(typeof schema, "object");
  assert(schema !== null && !Array.isArray(schema));
  const graph = schema["@graph"];
  assert(Array.isArray(graph));
  const posting = graph.find(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      entry["@type"] === "BlogPosting"
  );
  assert(posting && typeof posting === "object" && !Array.isArray(posting));
  return posting;
}

test("JSON-LD serialization is script-safe and preserves CMS values", () => {
  const special = [
    "quotes: \"double\" and 'apostrophe'",
    "ampersand: A & B",
    "Unicode: Ω café 漢字 😀",
    "multiline",
    "second line",
    "</script><script>alert('unsafe')</script>",
    "line separators: \u2028 \u2029",
  ].join("\n");
  const blog = makeBlog({
    title: special,
    excerpt: special,
    content: special,
    cover_alt: special,
    author: special,
  });
  const schema = buildBlogStructuredData(blog);
  const serialized = serializeStructuredDataForHtml(schema);

  assert.equal(serialized.includes("<"), false);
  assert.equal(serialized.toLowerCase().includes("</script>"), false);
  assert.deepEqual(JSON.parse(serialized), schema);
  assert.equal(getBlogPosting(JSON.parse(serialized)).headline, special);
});

test("JSON-LD serialization keeps global-schema-shaped special values script-safe", () => {
  const special = [
    '</script><script>alert("x")</script>',
    "<script>",
    "< > & \" ' Ω 漢字 😀",
    "first line\nsecond line",
    "separators: \u2028 \u2029",
  ].join("\n");
  const globalSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: special,
      description: special,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: special,
      contactPoint: { "@type": "ContactPoint", email: special, url: special },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: special,
      description: special,
      featureList: [special],
    },
  ];
  const serialized = serializeStructuredDataForHtml(globalSchema);

  assert.equal(serialized.includes("<"), false);
  assert.equal(serialized.includes(">"), false);
  assert.equal(serialized.includes("&"), false);
  assert.equal(serialized.toLowerCase().includes("</script>"), false);
  assert.deepEqual(JSON.parse(serialized), globalSchema);
});

test("the CMS title is the visible H1 and structured-data headline", () => {
  const blog = makeBlog({ title: "Canonical & Unicode title Ω" });
  const schema = buildBlogStructuredData(blog);
  const html = renderToStaticMarkup(<BlogArticleHeader blog={blog} />);
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1];

  assert.equal(h1, "Canonical &amp; Unicode title Ω");
  assert.equal(html.includes("Independently edited Markdown H1"), false);
  assert.equal(getBlogPosting(schema).headline, blog.title);
});

test("articleBody matches the rendered article body without the extracted Markdown H1", () => {
  const blog = makeBlog({
    content: "# Stale content-authored title\n\nActual article body.",
  });
  const posting = getBlogPosting(buildBlogStructuredData(blog));

  assert.equal(posting.articleBody, "Actual article body.");
  assert.equal(posting.articleBody?.includes("Stale content-authored title"), false);
});

test("noindex suppresses blog-page JSON-LD without affecting indexable blogs", () => {
  assert.equal(buildPublicBlogStructuredData(makeBlog({ no_index: true })), null);
  assert.notEqual(buildPublicBlogStructuredData(makeBlog({ no_index: false })), null);
});

test("blog schema adopts centralized canonical identities without changing article values", () => {
  const blog = makeBlog({ cover_image: "https://cdn.example.com/article.webp?version=1" });
  const schema = buildBlogStructuredData(blog);
  assert(schema);
  const graph = schema["@graph"] as Record<string, unknown>[];
  const canonicalUrl = "https://www.splitcost.in/en/blog/canonical-article-title";
  const posting = graph.find((entry) => entry["@type"] === "BlogPosting");
  const webPage = graph.find((entry) => entry["@type"] === "WebPage");
  const image = graph.find((entry) => entry["@type"] === "ImageObject");
  const breadcrumb = graph.find((entry) => entry["@type"] === "BreadcrumbList");
  const breadcrumbItems = breadcrumb?.itemListElement as Record<string, unknown>[];

  assert.equal(posting?.["@id"], getBlogPostingId(canonicalUrl));
  assert.deepEqual(posting?.image, { "@id": getImageObjectId(blog.cover_image!) });
  assert.deepEqual(posting?.mainEntityOfPage, { "@id": getWebPageId(canonicalUrl) });
  assert.equal(posting?.breadcrumb, undefined);
  assert.equal(webPage?.["@id"], getWebPageId(canonicalUrl));
  assert.equal(webPage?.url, canonicalUrl);
  assert.deepEqual(webPage?.isPartOf, { "@id": getWebsiteId() });
  assert.deepEqual(webPage?.breadcrumb, { "@id": getBreadcrumbId(canonicalUrl) });
  assert.deepEqual(posting?.publisher, { "@id": getOrganizationId() });
  assert.equal(image?.["@id"], getImageObjectId(blog.cover_image!));
  assert.equal(breadcrumb?.["@id"], getBreadcrumbId(canonicalUrl));
  assert.deepEqual(breadcrumbItems.map((item) => item.position), [1, 2, 3]);
  assert.deepEqual(breadcrumbItems.map((item) => item.item), [
    "https://www.splitcost.in/en",
    "https://www.splitcost.in/en/blog",
    canonicalUrl,
  ]);
});

test("generic fallback images remain a plain URL without an anonymous ImageObject", () => {
  const schema = buildBlogStructuredData(makeBlog({ cover_image: null }));
  assert(schema);
  const graph = schema["@graph"] as Record<string, unknown>[];
  const posting = graph.find((entry) => entry["@type"] === "BlogPosting");
  const image = graph.find((entry) => entry["@type"] === "ImageObject");

  assert.equal(posting?.image, "https://www.splitcost.in/og-image.png");
  assert.equal(image, undefined);
});
