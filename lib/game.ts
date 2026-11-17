import { createClient } from "@/lib/supabase/server";
import { getCurrentSeasonId } from "@/lib/seasons";
import type {
  LeaderboardEntry,
  Profile,
  ProfileTag,
  SpotlightCandidate,
} from "@/lib/types";

const BEGINNER_DAYS = 30;
const BEGINNER_MAX_LEVEL = 3;

export function bannerForRank(rank: number): string {
  if (rank >= 40) return "banner-legend";
  if (rank >= 26) return "banner-veteran";
  if (rank >= 11) return "banner-rising";
  return "banner-spark";
}

export function titleForTags(tags: ProfileTag[]): string | null {
  const level = (name: string) =>
    tags.find((t) => t.tag === name)?.level ?? 0;

  if (level("chess") >= 8 && level("coffee") >= 5) return "Cafe Grandmaster";
  if (level("climbing") >= 7 && level("photography") >= 4)
    return "Summit Framer";
  if (level("pottery") >= 6 && level("hiking") >= 4) return "Clay Trailwalker";
  if (level("synth") >= 6) return "Patch Wizard";
  if (tags.some((t) => t.level >= 9)) return "Domain Ace";
  if (tags.filter((t) => t.level >= 5).length >= 3) return "Polymath";
  return null;
}

export function isBeginnerTag(tag: ProfileTag, now = Date.now()): boolean {
  const created = Date.parse(tag.created_at);
  const ageDays = Number.isFinite(created)
    ? (now - created) / (1000 * 60 * 60 * 24)
    : 999;
  return ageDays <= BEGINNER_DAYS || tag.level <= BEGINNER_MAX_LEVEL;
}

export async function touchStreak(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("streak_count, last_streak_date")
    .eq("id", profileId)
    .maybeSingle();
  if (!data) return;

  const today = new Date().toISOString().slice(0, 10);
  const last = data.last_streak_date as string | null;
  if (last === today) return;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const next = last === yesterday ? (data.streak_count as number) + 1 : 1;

  await supabase
    .from("profiles")
    .update({
      streak_count: next,
      last_streak_date: today,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", profileId);
}

export async function listTagLeaderboard(
  tag: string,
  bracket: "beginner" | "open" | "all" = "all",
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_tags")
    .select("tag, level, created_at, profile_id, profiles(handle, rank)")
    .eq("tag", tag)
    .order("level", { ascending: false })
    .limit(40);

  const mapped: LeaderboardEntry[] = (data ?? []).map((row) => {
    const profile = row.profiles as unknown as {
      handle: string;
      rank: number;
    } | null;
    const entryTag: ProfileTag = {
      id: "",
      profile_id: row.profile_id as string,
      tag: row.tag as string,
      level: row.level as number,
      is_primary: false,
      created_at: row.created_at as string,
      endorsement_count: 0,
    };
    return {
      profile_id: row.profile_id as string,
      handle: profile?.handle ?? "unknown",
      tag: row.tag as string,
      level: row.level as number,
      bracket: isBeginnerTag(entryTag) ? "beginner" : "open",
    };
  });

  const filtered =
    bracket === "all" ? mapped : mapped.filter((e) => e.bracket === bracket);
  return filtered.slice(0, 10);
}

export async function resetSeason(newName = "New Season") {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();

  if (current?.id) {
    await supabase
      .from("seasons")
      .update({ is_current: false, ended_at: now })
      .eq("id", current.id);
  }

  const { data: season, error } = await supabase
    .from("seasons")
    .insert({ name: newName, started_at: now, is_current: true })
    .select("id")
    .single();
  if (error || !season) throw error ?? new Error("Season create failed");

  const { data: profiles } = await supabase.from("profiles").select("id, rank");
  if (profiles?.length) {
    await supabase.from("season_baselines").insert(
      profiles.map((p) => ({
        season_id: season.id,
        profile_id: p.id,
        rank: p.rank,
      })),
    );
  }

  await supabase.from("profiles").update({ season_points: 0 }).neq("id", "00000000-0000-0000-0000-000000000000");
  return season.id as string;
}

export async function listSpotlightCandidates(): Promise<SpotlightCandidate[]> {
  const supabase = await createClient();
  const seasonId = await getCurrentSeasonId();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, handle, bio, rank, season_points")
    .order("season_points", { ascending: false })
    .limit(40);

  const { data: votes } = await supabase
    .from("spotlight_votes")
    .select("candidate_id")
    .eq("season_id", seasonId);

  const counts = new Map<string, number>();
  for (const vote of votes ?? []) {
    const id = vote.candidate_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return (profiles ?? [])
    .map((p) => ({
      profile_id: p.id as string,
      handle: p.handle as string,
      bio: p.bio as string,
      rank: p.rank as number,
      votes: counts.get(p.id as string) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes || b.rank - a.rank)
    .slice(0, 12);
}

export async function voteSpotlight(voterId: string, candidateId: string) {
  if (voterId === candidateId) throw new Error("Cannot vote for yourself");
  const supabase = await createClient();
  const seasonId = await getCurrentSeasonId();
  const { error } = await supabase.from("spotlight_votes").upsert(
    {
      season_id: seasonId,
      voter_id: voterId,
      candidate_id: candidateId,
      created_at: new Date().toISOString(),
    },
    { onConflict: "season_id,voter_id" },
  );
  if (error) throw error;
  await touchStreak(voterId);
}

export function decorateProfile(profile: Profile, tags: ProfileTag[]) {
  return {
    title: titleForTags(tags),
    banner: bannerForRank(profile.rank),
  };
}
