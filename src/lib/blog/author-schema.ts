import type { Json } from "@/integrations/supabase/types";
import { getOrganizationId } from "@/lib/schema-identity";

/** The documented editorial byline used by the CMS and all published posts. */
export const EDITORIAL_TEAM_AUTHOR = "SplitCost Team";

/**
 * Only the CMS's documented editorial byline has a verifiable schema identity.
 * Other free-text values have no author type, profile, or stable identifier in
 * the current data model, so they intentionally produce no structured author.
 */
export function buildBlogAuthorStructuredData(author: string): Json | undefined {
  return author === EDITORIAL_TEAM_AUTHOR ? { "@id": getOrganizationId() } : undefined;
}
