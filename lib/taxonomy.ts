import { createClient } from "@/lib/supabase/server";
import { normalizeTag } from "@/lib/tags";
import {
  CATEGORY_LABELS,
  SUBTAGS,
  TAXONOMY,
  type TaxonomyCategory,
  type TaxonomySubtag,
  type TaxonomyTag,
} from "@/lib/taxonomy-data";

export type { TaxonomyCategory, TaxonomySubtag, TaxonomyTag };
export { CATEGORY_LABELS, SUBTAGS, TAXONOMY };

export async function listTaxonomy(): Promise<TaxonomyTag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("taxonomy_tags")
    .select("slug, label, category")
    .order("category")
    .order("label");
  if (data?.length) return data as TaxonomyTag[];
  return TAXONOMY;
}

export async function listTaxonomyByCategory() {
  const tags = await listTaxonomy();
  const order = Object.keys(CATEGORY_LABELS) as TaxonomyCategory[];
  return order.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    tags: tags.filter((t) => t.category === category),
  }));
}

export async function getTaxonomyTag(
  slug: string,
): Promise<TaxonomyTag | null> {
  const normalized = normalizeTag(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("taxonomy_tags")
    .select("slug, label, category")
    .eq("slug", normalized)
    .maybeSingle();
  if (data) return data as TaxonomyTag;
  return TAXONOMY.find((t) => t.slug === normalized) ?? null;
}

export async function isApprovedTag(slug: string): Promise<boolean> {
  return Boolean(await getTaxonomyTag(slug));
}

export async function listSubtags(): Promise<TaxonomySubtag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("taxonomy_subtags")
    .select("slug, parent_slug, label")
    .order("parent_slug")
    .order("label");
  if (data?.length) return data as TaxonomySubtag[];
  return SUBTAGS;
}

export async function listSubtagsForParent(
  parentSlug: string,
): Promise<TaxonomySubtag[]> {
  const normalized = normalizeTag(parentSlug);
  const all = await listSubtags();
  return all.filter((s) => s.parent_slug === normalized);
}

export async function getTaxonomySubtag(
  slug: string,
): Promise<TaxonomySubtag | null> {
  const normalized = normalizeTag(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("taxonomy_subtags")
    .select("slug, parent_slug, label")
    .eq("slug", normalized)
    .maybeSingle();
  if (data) return data as TaxonomySubtag;
  return SUBTAGS.find((s) => s.slug === normalized) ?? null;
}

export async function isApprovedSubtag(slug: string): Promise<boolean> {
  return Boolean(await getTaxonomySubtag(slug));
}

export async function listRelatedInCategory(
  slug: string,
): Promise<TaxonomyTag[]> {
  const tag = await getTaxonomyTag(slug);
  if (!tag) return [];
  const all = await listTaxonomy();
  return all.filter((t) => t.category === tag.category && t.slug !== tag.slug);
}
