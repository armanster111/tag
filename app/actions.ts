"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resetSeason, voteSpotlight } from "@/lib/game";
import {
  createProfile,
  endorseTag,
  getProfileByHandle,
  updateProfile,
  type TagInput,
} from "@/lib/profiles";
import {
  getAuthUserId,
  getSessionProfile,
  getSessionProfileId,
} from "@/lib/session";
import {
  acceptFriend,
  blockUser,
  muteUser,
  reportUser,
  requestFriend,
  sendMessage,
  sendWave,
  unblockUser,
  unmuteUser,
} from "@/lib/social";
import { createClient } from "@/lib/supabase/server";
import { isValidHandle, normalizeHandle } from "@/lib/tags";
import {
  approveSuggestion,
  rejectSuggestion,
  suggestTag,
  type TaxonomyCategory,
} from "@/lib/taxonomy";

function parseTagsFromForm(formData: FormData): TagInput[] {
  const primaryTag = String(formData.get("primary_tag") ?? "");
  const primaryLevel = Number(formData.get("primary_level") ?? 1);
  const secondaryRaw = String(formData.get("secondary_tags") ?? "");

  const tags: TagInput[] = [
    { tag: primaryTag, level: primaryLevel, is_primary: true },
  ];

  for (const chunk of secondaryRaw.split(",")) {
    const piece = chunk.trim();
    if (!piece) continue;
    const [name, levelPart] = piece.split(":");
    tags.push({
      tag: name,
      level: Number(levelPart ?? 1),
      is_primary: false,
    });
  }

  return tags;
}

async function requireSession() {
  const id = await getSessionProfileId();
  if (!id) redirect("/login");
  return id;
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function loginWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/login?error=invalid");

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) redirect("/login?error=send");
  redirect("/login?sent=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function onboardProfile(formData: FormData) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");

  const existing = await getSessionProfile();
  if (existing) redirect(`/u/${existing.handle}`);

  const handle = normalizeHandle(String(formData.get("handle") ?? ""));
  const bio = String(formData.get("bio") ?? "");
  const looking_for = String(formData.get("looking_for") ?? "");

  if (!isValidHandle(handle)) redirect("/onboarding?error=invalid");

  try {
    const profile = await createProfile({
      userId,
      handle,
      bio,
      looking_for,
      tags: parseTagsFromForm(formData),
    });
    revalidatePath("/");
    redirect(`/u/${profile.handle}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("taxonomy")) {
      redirect(
        `/onboarding?handle=${encodeURIComponent(handle)}&error=taxonomy`,
      );
    }
    redirect(`/onboarding?handle=${encodeURIComponent(handle)}&error=taken`);
  }
}

export async function saveProfile(formData: FormData) {
  const sessionId = await requireSession();
  const handle = normalizeHandle(String(formData.get("handle") ?? ""));
  try {
    await updateProfile(sessionId, {
      bio: String(formData.get("bio") ?? ""),
      looking_for: String(formData.get("looking_for") ?? ""),
      tags: parseTagsFromForm(formData),
    });
  } catch {
    redirect(`/u/${handle}/edit?error=taxonomy`);
  }
  revalidatePath("/");
  revalidatePath(`/u/${handle}`);
  redirect(`/u/${handle}`);
}

export async function suggestNewTag(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  const sessionId = await getAuthUserId();
  try {
    const result = await suggestTag({
      label: String(formData.get("label") ?? ""),
      category: String(formData.get("category") ?? "") || undefined,
      note: String(formData.get("note") ?? ""),
      suggestedBy: sessionId,
    });
    revalidatePath("/tags");
    revalidatePath("/tags/review");
    return {
      ok: true,
      message: `"${result.label}" submitted for review as ${result.slug}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not suggest tag",
    };
  }
}

export async function approveTagSuggestion(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const category = String(formData.get("category") ?? "") as TaxonomyCategory;
  await approveSuggestion(id, category);
  revalidatePath("/tags");
  revalidatePath("/tags/review");
  redirect("/tags/review");
}

export async function rejectTagSuggestion(formData: FormData) {
  await requireSession();
  await rejectSuggestion(String(formData.get("id") ?? ""));
  revalidatePath("/tags/review");
  redirect("/tags/review");
}

export async function endorseProfileTag(formData: FormData) {
  const sessionId = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const tag = String(formData.get("tag") ?? "");
  try {
    await endorseTag(sessionId, handle, tag);
  } catch {
    redirect(`/u/${handle}?error=endorse`);
  }
  revalidatePath(`/u/${handle}`);
  revalidatePath("/");
  redirect(`/u/${handle}`);
}

export async function waveAt(formData: FormData) {
  const sessionId = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const profile = await getProfileByHandle(handle);
  if (!profile) redirect("/");
  try {
    await sendWave(sessionId, profile.id);
  } catch {
    redirect(`/u/${handle}?error=wave`);
  }
  revalidatePath(`/u/${handle}`);
  redirect(`/u/${handle}`);
}

export async function friendRequest(formData: FormData) {
  const sessionId = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const profile = await getProfileByHandle(handle);
  if (!profile) redirect("/");
  try {
    await requestFriend(sessionId, profile.id);
  } catch {
    redirect(`/u/${handle}?error=friend`);
  }
  revalidatePath(`/u/${handle}`);
  revalidatePath("/friends");
  redirect(`/u/${handle}`);
}

export async function friendAccept(formData: FormData) {
  const sessionId = await requireSession();
  await acceptFriend(sessionId, String(formData.get("friendship_id") ?? ""));
  revalidatePath("/friends");
  redirect("/friends");
}

export async function blockProfile(formData: FormData) {
  const sessionId = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const profile = await getProfileByHandle(handle);
  if (!profile) redirect("/");
  await blockUser(sessionId, profile.id);
  revalidatePath("/");
  redirect("/settings/safety");
}

export async function unblockProfile(formData: FormData) {
  const sessionId = await requireSession();
  await unblockUser(sessionId, String(formData.get("profile_id") ?? ""));
  revalidatePath("/settings/safety");
  redirect("/settings/safety");
}

export async function muteProfile(formData: FormData) {
  const sessionId = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const profile = await getProfileByHandle(handle);
  if (!profile) redirect("/");
  await muteUser(sessionId, profile.id);
  revalidatePath("/");
  redirect("/settings/safety");
}

export async function unmuteProfile(formData: FormData) {
  const sessionId = await requireSession();
  await unmuteUser(sessionId, String(formData.get("profile_id") ?? ""));
  revalidatePath("/settings/safety");
  redirect("/settings/safety");
}

export async function reportProfile(formData: FormData) {
  const sessionId = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const profile = await getProfileByHandle(handle);
  if (!profile) redirect("/");
  try {
    await reportUser(sessionId, profile.id, reason);
  } catch {
    redirect(`/u/${handle}?error=report`);
  }
  redirect(`/u/${handle}?reported=1`);
}

export async function sendDm(formData: FormData) {
  const sessionId = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const body = String(formData.get("body") ?? "");
  const profile = await getProfileByHandle(handle);
  if (!profile) redirect("/messages");
  try {
    await sendMessage(sessionId, profile.id, body);
  } catch {
    redirect(`/messages/${handle}?error=1`);
  }
  revalidatePath(`/messages/${handle}`);
  redirect(`/messages/${handle}`);
}

export async function castSpotlightVote(formData: FormData) {
  const sessionId = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const profile = await getProfileByHandle(handle);
  if (!profile) redirect("/spotlights");
  try {
    await voteSpotlight(sessionId, profile.id);
  } catch {
    redirect("/spotlights?error=1");
  }
  revalidatePath("/spotlights");
  redirect("/spotlights");
}

export async function adminResetSeason() {
  await requireSession();
  await resetSeason(`Season ${new Date().toISOString().slice(0, 10)}`);
  revalidatePath("/");
  revalidatePath("/leaderboards");
  redirect("/leaderboards?reset=1");
}
