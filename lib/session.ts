import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getSessionProfile(): Promise<Profile | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getSessionProfileId(): Promise<string | null> {
  const profile = await getSessionProfile();
  return profile?.id ?? null;
}
