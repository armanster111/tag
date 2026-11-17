import { decorateProfile, touchStreak } from "@/lib/game";
import { createClient } from "@/lib/supabase/server";
import { isBlockedEither, isMuted } from "@/lib/social";
import { clampLevel, normalizeHandle, normalizeTag } from "@/lib/tags";
import {
  getTaxonomySubtag,
  isApprovedSubtag,
  isApprovedTag,
} from "@/lib/taxonomy";
import type {
  Endorsement,
  FeedSort,
  Profile,
  ProfileSubtag,
  ProfileTag,
  ProfileWithTags,
  RisingProfile,
  SimilarProfile,
  TagCloudItem,
} from "@/lib/types";

function mapTag(
  row: {
    id: string;
    profile_id: string;
    tag: string;
    level: number;
    is_primary: boolean;
    created_at: string;
  },
  endorsementCount = 0,
): ProfileTag {
  return {
    id: row.id,
    profile_id: row.profile_id,
    tag: row.tag,
    level: row.level,
    is_primary: Boolean(row.is_primary),
    created_at: row.created_at,
    endorsement_count: endorsementCount,
  };
}

async function endorsementCounts(profileId: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("endorsements")
    .select("tag")
    .eq("to_profile_id", profileId);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const tag = row.tag as string;
    map.set(tag, (map.get(tag) ?? 0) + 1);
  }
  return map;
}

async function listEndorsements(profileId: string): Promise<Endorsement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("endorsements")
    .select("*, profiles!endorsements_from_profile_id_fkey(handle)")
    .eq("to_profile_id", profileId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const from = row.profiles as unknown as { handle: string } | null;
    return {
      id: row.id as string,
      from_profile_id: row.from_profile_id as string,
      to_profile_id: row.to_profile_id as string,
      tag: row.tag as string,
      created_at: row.created_at as string,
      from_handle: from?.handle,
    };
  });
}

async function loadProfileSubtags(
  profileId: string,
): Promise<ProfileSubtag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_subtags")
    .select("subtag_slug, taxonomy_subtags(slug, label, parent_slug)")
    .eq("profile_id", profileId);

  return (data ?? [])
    .map((row) => {
      const meta = row.taxonomy_subtags as unknown as {
        slug: string;
        label: string;
        parent_slug: string;
      } | null;
      if (!meta) return null;
      return {
        slug: meta.slug,
        label: meta.label,
        parent_slug: meta.parent_slug,
      };
    })
    .filter((row): row is ProfileSubtag => Boolean(row))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function attachTags(profile: Profile): Promise<ProfileWithTags> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_tags")
    .select("*")
    .eq("profile_id", profile.id)
    .order("is_primary", { ascending: false });

  const counts = await endorsementCounts(profile.id);
  const tags = (data ?? []).map((row) =>
    mapTag(
      row as {
        id: string;
        profile_id: string;
        tag: string;
        level: number;
        is_primary: boolean;
        created_at: string;
      },
      counts.get(row.tag as string) ?? 0,
    ),
  );
  const subtags = await loadProfileSubtags(profile.id);
  const deco = decorateProfile(profile, tags);
  return {
    ...profile,
    tags,
    subtags,
    primary_tag: tags.find((t) => t.is_primary) ?? null,
    endorsements: await listEndorsements(profile.id),
    title: deco.title,
    banner: deco.banner,
  };
}

async function visibleToViewer(
  profiles: ProfileWithTags[],
  viewerId: string | null,
): Promise<ProfileWithTags[]> {
  if (!viewerId) return profiles;
  const out: ProfileWithTags[] = [];
  for (const p of profiles) {
    if (p.id === viewerId) {
      out.push(p);
      continue;
    }
    if (
      !(await isBlockedEither(viewerId, p.id)) &&
      !(await isMuted(viewerId, p.id))
    ) {
      out.push(p);
    }
  }
  return out;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getProfileByHandle(
  handle: string,
): Promise<Profile | null> {
  const normalized = normalizeHandle(handle);
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("handle", normalized)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getProfileWithTagsByHandle(
  handle: string,
): Promise<ProfileWithTags | null> {
  const profile = await getProfileByHandle(handle);
  return profile ? attachTags(profile) : null;
}

export async function getProfileWithTagsById(
  id: string,
): Promise<ProfileWithTags | null> {
  const profile = await getProfileById(id);
  return profile ? attachTags(profile) : null;
}

export async function listFeed(
  sort: FeedSort,
  viewerId: string | null = null,
): Promise<ProfileWithTags[] | RisingProfile[]> {
  if (sort === "rising") return listRising(viewerId);

  const supabase = await createClient();
  const orderCol = sort === "active" ? "last_active_at" : "created_at";
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order(orderCol, { ascending: false });

  const mapped = await Promise.all(
    ((data as Profile[]) ?? []).map((p) => attachTags(p)),
  );
  return visibleToViewer(mapped, viewerId);
}

export async function listRising(
  viewerId: string | null = null,
): Promise<RisingProfile[]> {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*");
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const rising: RisingProfile[] = [];
  for (const profile of (profiles as Profile[]) ?? []) {
    const { data: baselineRows } = await supabase
      .from("rank_events")
      .select("rank, created_at")
      .eq("profile_id", profile.id)
      .lte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    let baseline = baselineRows?.[0]?.rank as number | undefined;
    if (baseline == null) {
      const { data: earliest } = await supabase
        .from("rank_events")
        .select("rank")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: true })
        .limit(1);
      baseline = (earliest?.[0]?.rank as number | undefined) ?? profile.rank;
    }

    const rank_delta = profile.rank - baseline;
    if (rank_delta > 0) {
      rising.push({ ...(await attachTags(profile)), rank_delta });
    }
  }

  rising.sort((a, b) => b.rank_delta - a.rank_delta || b.rank - a.rank);
  return (await visibleToViewer(rising, viewerId)) as RisingProfile[];
}

export async function listByTag(
  tag: string,
  level?: number,
  viewerId: string | null = null,
  subtag?: string,
): Promise<ProfileWithTags[]> {
  const normalized = normalizeTag(tag);
  const supabase = await createClient();
  let query = supabase
    .from("profile_tags")
    .select("profiles(*)")
    .eq("tag", normalized);
  if (level != null) query = query.eq("level", clampLevel(level));

  const { data } = await query;
  let profiles = (data ?? [])
    .map((row) => row.profiles as unknown as Profile)
    .filter(Boolean);

  const sub = subtag ? normalizeTag(subtag) : "";
  if (sub) {
    const { data: subRows } = await supabase
      .from("profile_subtags")
      .select("profile_id")
      .eq("subtag_slug", sub);
    const allowed = new Set(
      (subRows ?? []).map((row) => row.profile_id as string),
    );
    profiles = profiles.filter((p) => allowed.has(p.id));
  }

  const mapped = await Promise.all(profiles.map((p) => attachTags(p)));
  return visibleToViewer(mapped, viewerId);
}

export async function listByLookingFor(
  queryText: string,
  viewerId: string | null = null,
): Promise<ProfileWithTags[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("looking_for", `%${queryText.trim()}%`)
    .order("last_active_at", { ascending: false });
  const mapped = await Promise.all(
    ((data as Profile[]) ?? []).map((p) => attachTags(p)),
  );
  return visibleToViewer(mapped, viewerId);
}

export async function listSimilarTo(
  profileId: string,
  limit = 6,
): Promise<SimilarProfile[]> {
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("profile_tags")
    .select("tag")
    .eq("profile_id", profileId);
  const tags = (mine ?? []).map((t) => t.tag as string);
  if (tags.length === 0) return [];

  const { data } = await supabase
    .from("profile_tags")
    .select("profile_id, tag, profiles(*)")
    .in("tag", tags)
    .neq("profile_id", profileId);

  const byProfile = new Map<string, { profile: Profile; shared: Set<string> }>();
  for (const row of data ?? []) {
    const profile = row.profiles as unknown as Profile;
    if (!profile) continue;
    const entry = byProfile.get(profile.id) ?? {
      profile,
      shared: new Set<string>(),
    };
    entry.shared.add(row.tag as string);
    byProfile.set(profile.id, entry);
  }

  const ranked = [...byProfile.values()]
    .sort((a, b) => b.shared.size - a.shared.size || b.profile.rank - a.profile.rank)
    .slice(0, limit);

  const mapped = await Promise.all(
    ranked.map(async (entry) => ({
      ...(await attachTags(entry.profile)),
      shared_tags: [...entry.shared],
    })),
  );
  return (await visibleToViewer(mapped, profileId)) as SimilarProfile[];
}

export async function listTagCloud(): Promise<TagCloudItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_tags")
    .select("tag, taxonomy_tags(label, category)");

  const counts = new Map<string, TagCloudItem>();
  for (const row of data ?? []) {
    const tag = row.tag as string;
    const meta = row.taxonomy_tags as unknown as {
      label: string;
      category: string;
    } | null;
    const current = counts.get(tag) ?? {
      tag,
      label: meta?.label ?? tag,
      category: meta?.category,
      count: 0,
    };
    current.count += 1;
    counts.set(tag, current);
  }

  return [...counts.values()].sort(
    (a, b) => b.count - a.count || (a.label ?? a.tag).localeCompare(b.label ?? b.tag),
  );
}

export type TagInput = {
  tag: string;
  level: number;
  is_primary?: boolean;
};

async function normalizeTagInputs(tags: TagInput[]) {
  const cleaned: Array<{ tag: string; level: number; is_primary: boolean }> =
    [];
  const seen = new Set<string>();

  for (const raw of tags) {
    const tag = normalizeTag(raw.tag);
    if (!tag || seen.has(tag)) continue;
    if (!(await isApprovedTag(tag))) {
      throw new Error(`Tag "${tag}" is not in the curated taxonomy`);
    }
    seen.add(tag);
    cleaned.push({
      tag,
      level: clampLevel(raw.level),
      is_primary: Boolean(raw.is_primary),
    });
  }

  if (cleaned.length === 0) throw new Error("At least one tag is required");
  if (!cleaned.some((t) => t.is_primary)) cleaned[0].is_primary = true;
  else {
    let found = false;
    for (const tag of cleaned) {
      if (tag.is_primary && !found) found = true;
      else tag.is_primary = false;
    }
  }
  return cleaned;
}

async function normalizeSubtagInputs(
  parentTags: string[],
  subtags: string[],
): Promise<string[]> {
  const parents = new Set(parentTags);
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const raw of subtags) {
    const slug = normalizeTag(raw);
    if (!slug || seen.has(slug)) continue;
    if (!(await isApprovedSubtag(slug))) {
      throw new Error(`Sub-tag "${slug}" is not in the curated taxonomy`);
    }
    const meta = await getTaxonomySubtag(slug);
    if (!meta || !parents.has(meta.parent_slug)) {
      throw new Error(
        `Sub-tag "${slug}" requires its parent tag on the profile`,
      );
    }
    seen.add(slug);
    cleaned.push(slug);
  }

  return cleaned;
}

async function replaceProfileSubtags(profileId: string, subtags: string[]) {
  const supabase = await createClient();
  await supabase.from("profile_subtags").delete().eq("profile_id", profileId);
  if (subtags.length === 0) return;
  const { error } = await supabase.from("profile_subtags").insert(
    subtags.map((subtag_slug) => ({
      profile_id: profileId,
      subtag_slug,
    })),
  );
  if (error) throw error;
}

export async function createProfile(input: {
  userId: string;
  handle: string;
  bio: string;
  looking_for?: string;
  tags: TagInput[];
  subtags?: string[];
}): Promise<ProfileWithTags> {
  const handle = normalizeHandle(input.handle);
  if (!handle) throw new Error("Handle required");
  if (await getProfileByHandle(handle)) throw new Error("Handle already taken");

  const tags = await normalizeTagInputs(input.tags);
  const subtags = await normalizeSubtagInputs(
    tags.map((t) => t.tag),
    input.subtags ?? [],
  );
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: profileError } = await supabase.from("profiles").insert({
    id: input.userId,
    handle,
    bio: input.bio.trim().slice(0, 140),
    looking_for: (input.looking_for ?? "").trim().slice(0, 140),
    streak_count: 1,
    last_streak_date: now.slice(0, 10),
    created_at: now,
    last_active_at: now,
  });
  if (profileError) throw profileError;

  const { error: tagsError } = await supabase.from("profile_tags").insert(
    tags.map((tag) => ({
      profile_id: input.userId,
      tag: tag.tag,
      level: tag.level,
      is_primary: tag.is_primary,
      created_at: now,
    })),
  );
  if (tagsError) throw tagsError;

  await replaceProfileSubtags(input.userId, subtags);

  await supabase.from("rank_events").insert({
    profile_id: input.userId,
    rank: 0,
    created_at: now,
  });

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (season?.id) {
    await supabase.from("season_baselines").upsert({
      season_id: season.id,
      profile_id: input.userId,
      rank: 0,
    });
  }

  const profile = await getProfileWithTagsById(input.userId);
  if (!profile) throw new Error("Failed to create profile");
  return profile;
}

export async function updateProfile(
  profileId: string,
  input: {
    bio: string;
    looking_for: string;
    tags: TagInput[];
    subtags?: string[];
  },
): Promise<ProfileWithTags> {
  const tags = await normalizeTagInputs(input.tags);
  const subtags = await normalizeSubtagInputs(
    tags.map((t) => t.tag),
    input.subtags ?? [],
  );
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      bio: input.bio.trim().slice(0, 140),
      looking_for: input.looking_for.trim().slice(0, 140),
      last_active_at: now,
    })
    .eq("id", profileId);
  if (profileError) throw profileError;

  await supabase.from("profile_tags").delete().eq("profile_id", profileId);
  const { error: tagsError } = await supabase.from("profile_tags").insert(
    tags.map((tag) => ({
      profile_id: profileId,
      tag: tag.tag,
      level: tag.level,
      is_primary: tag.is_primary,
      created_at: now,
    })),
  );
  if (tagsError) throw tagsError;

  await replaceProfileSubtags(profileId, subtags);

  await touchStreak(profileId);
  const profile = await getProfileWithTagsById(profileId);
  if (!profile) throw new Error("Profile not found");
  return profile;
}

export async function endorseTag(
  fromId: string,
  toHandle: string,
  tag: string,
) {
  const to = await getProfileByHandle(toHandle);
  if (!to) throw new Error("Profile not found");
  if (to.id === fromId) throw new Error("Cannot endorse yourself");
  if (await isBlockedEither(fromId, to.id)) throw new Error("Blocked");

  const normalized = normalizeTag(tag);
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("profile_tags")
    .select("level")
    .eq("profile_id", to.id)
    .eq("tag", normalized)
    .maybeSingle();
  if (!owned) throw new Error("Tag not on profile");

  const { error } = await supabase.from("endorsements").insert({
    from_profile_id: fromId,
    to_profile_id: to.id,
    tag: normalized,
  });
  if (error) throw new Error("Already endorsed");

  if ((owned.level as number) < 10) {
    await supabase
      .from("profile_tags")
      .update({ level: (owned.level as number) + 1 })
      .eq("profile_id", to.id)
      .eq("tag", normalized);
  }

  await touchStreak(fromId);
  return getProfileWithTagsById(to.id);
}
