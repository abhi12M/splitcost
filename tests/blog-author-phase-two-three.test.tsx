import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBlogAuthorStructuredData,
  EDITORIAL_TEAM_AUTHOR,
} from "../src/lib/blog/author-schema";
import { buildBlogStructuredData } from "../src/lib/blog/schema";
import { getOrganizationId } from "../src/lib/schema-identity";
import type { Blog } from "../src/lib/blog/types";

function makeBlog(author: string): Blog {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Author architecture test",
    slug: "author-architecture-test",
    excerpt: "A representative article description.",
    content: "Article body.",
    cover_image: null,
    cover_alt: null,
    category: null,
    author,
    status: "published",
    published_at: "2026-09-01T10:00:00.000Z",
    reading_time: 1,
    no_index: false,
    is_featured: false,
    views: 0,
    created_at: "2026-09-01T09:00:00.000Z",
    updated_at: "2026-09-02T10:00:00.000Z",
  };
}

function getPosting(blog: Blog) {
  const schema = buildBlogStructuredData(blog);
  assert(schema && typeof schema === "object" && !Array.isArray(schema));
  const graph = schema["@graph"] as Record<string, unknown>[];
  return graph.find((entry) => entry["@type"] === "BlogPosting");
}

test("the documented SplitCost Team editorial byline references the canonical Organization", () => {
  assert.deepEqual(buildBlogAuthorStructuredData(EDITORIAL_TEAM_AUTHOR), {
    "@id": getOrganizationId(),
  });

  const posting = getPosting(makeBlog(EDITORIAL_TEAM_AUTHOR));
  assert.deepEqual(posting?.author, { "@id": getOrganizationId() });
  assert.deepEqual(posting?.publisher, { "@id": getOrganizationId() });
  assert.equal(posting?.headline, "Author architecture test");
});

test("unstructured free-text author values do not receive invented schema identities", () => {
  assert.equal(buildBlogAuthorStructuredData("A hypothetical contributor"), undefined);

  const posting = getPosting(makeBlog("A hypothetical contributor"));
  assert.equal(posting?.author, undefined);
  assert.deepEqual(posting?.publisher, { "@id": getOrganizationId() });
});
