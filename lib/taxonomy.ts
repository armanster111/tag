import { createClient } from "@/lib/supabase/server";
import { normalizeTag } from "@/lib/tags";
import {
  CATEGORY_LABELS,
  TAXONOMY,
  type TaxonomyCategory,
  type TaxonomyTag,
} from "@/lib/taxonomy-data";

export type { TaxonomyCategory, TaxonomyTag };
export { CATEGORY_LABELS, TAXONOMY };

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

export async function suggestTag(input: {
  label: string;
  category?: string;
  note?: string;
  suggestedBy?: string | null;
}) {
  const label = input.label.trim().slice(0, 60);
  if (label.length < 2) throw new Error("Label too short");
  const slug = normalizeTag(label);
  if (!slug) throw new Error("Invalid tag");
  if (await isApprovedTag(slug)) throw new Error("Already in taxonomy");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tag_suggestions")
    .select("id")
    .eq("slug", slug)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) throw new Error("Already suggested");

  const { error } = await supabase.from("tag_suggestions").insert({
    slug,
    label,
    category: input.category?.trim() || null,
    suggested_by: input.suggestedBy ?? null,
    note: (input.note ?? "").trim().slice(0, 200),
    status: "pending",
  });
  if (error) throw error;
  return { slug, label };
}

export async function listPendingSuggestions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tag_suggestions")
    .select("*, profiles:suggested_by(handle)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { handle: string } | null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      label: row.label as string,
      category: row.category as string | null,
      note: row.note as string,
      created_at: row.created_at as string,
      suggester_handle: profile?.handle ?? null,
    };
  });
}

export async function approveSuggestion(
  id: string,
  category: TaxonomyCategory,
) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("tag_suggestions")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!row) throw new Error("Not found");

  const { error: insertError } = await supabase.from("taxonomy_tags").upsert({
    slug: row.slug,
    label: row.label,
    category,
  });
  if (insertError) throw insertError;

  const { error } = await supabase
    .from("tag_suggestions")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectSuggestion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tag_suggestions")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw error;
}

export async function listRelatedInCategory(
  slug: string,
): Promise<TaxonomyTag[]> {
  const tag = await getTaxonomyTag(slug);
  if (!tag) return [];
  const all = await listTaxonomy();
  return all.filter((t) => t.category === tag.category && t.slug !== tag.slug);
}
