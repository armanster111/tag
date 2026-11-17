import { createClient } from "@/lib/supabase/server";

export async function getCurrentSeasonId(): Promise<string> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (current?.id) return current.id as string;

  const { data: season, error } = await supabase
    .from("seasons")
    .insert({
      name: "Season 1",
      started_at: new Date().toISOString(),
      is_current: true,
    })
    .select("id")
    .single();
  if (error || !season) throw error ?? new Error("Could not create season");

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

  return season.id as string;
}
