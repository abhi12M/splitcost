import assert from "node:assert/strict";
import test from "node:test";

import {
  getBlogPostingId,
  getBreadcrumbId,
  getImageObjectId,
  getOrganizationId,
  getSoftwareApplicationId,
  getWebPageId,
  getWebsiteId,
  normalizeCanonicalPageUrl,
  normalizeSchemaImageUrl,
} from "../src/lib/schema-identity";

const canonicalBlogUrl = "https://www.splitcost.in/en/blog/example";

test("site-level schema identities use the configured canonical SplitCost host", () => {
  assert.equal(getOrganizationId(), "https://www.splitcost.in/#organization");
  assert.equal(getWebsiteId(), "https://www.splitcost.in/#website");
  assert.equal(getSoftwareApplicationId(), "https://www.splitcost.in/#software-application");
});

test("page schema identities derive deterministically from canonical page URLs", () => {
  assert.equal(getWebPageId(canonicalBlogUrl), `${canonicalBlogUrl}#webpage`);
  assert.equal(getBlogPostingId(canonicalBlogUrl), `${canonicalBlogUrl}#blog-posting`);
  assert.equal(getBreadcrumbId(canonicalBlogUrl), `${canonicalBlogUrl}#breadcrumb`);
  assert.equal(getWebPageId(canonicalBlogUrl), getWebPageId(canonicalBlogUrl));
});

test("canonical page identities normalize equivalent URL forms", () => {
  const expected = canonicalBlogUrl;

  assert.equal(normalizeCanonicalPageUrl("/en/blog/example/"), expected);
  assert.equal(normalizeCanonicalPageUrl(`${canonicalBlogUrl}/?utm_source=test#section`), expected);
  assert.equal(
    normalizeCanonicalPageUrl("https://splitcost.app/en/blog/example?utm_source=test"),
    expected
  );
  assert.equal(
    getWebPageId("https://www.splitcost.in/es/compare/example/?ref=campaign"),
    "https://www.splitcost.in/es/compare/example#webpage"
  );
});

test("image identities are deterministic for actual image URLs", () => {
  const imageUrl = "https://cdn.example.com/images/article.webp?cache=123#fragment";
  const expected = "https://cdn.example.com/images/article.webp?cache=123#image";

  assert.equal(normalizeSchemaImageUrl(imageUrl), "https://cdn.example.com/images/article.webp?cache=123");
  assert.equal(getImageObjectId(imageUrl), expected);
  assert.equal(getImageObjectId(imageUrl), getImageObjectId(imageUrl));
});
