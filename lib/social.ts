import { touchStreak } from "@/lib/game";
import { createClient } from "@/lib/supabase/server";
import type { Friendship, Message, Wave } from "@/lib/types";

function pairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function isBlockedEither(a: string, b: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`,
    )
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function isMuted(muterId: string, mutedId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mutes")
    .select("muter_id")
    .eq("muter_id", muterId)
    .eq("muted_id", mutedId)
    .maybeSingle();
  return Boolean(data);
}

export async function listFriends(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`a_id.eq.${profileId},b_id.eq.${profileId}`);

  const out = [];
  for (const row of data ?? []) {
    const friendId =
      row.a_id === profileId ? (row.b_id as string) : (row.a_id as string);
    const { data: friend } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", friendId)
      .maybeSingle();
    out.push({
      ...(row as Friendship),
      friend_id: friendId,
      friend_handle: friend?.handle ?? "unknown",
    });
  }
  return out.sort((a, b) => a.friend_handle.localeCompare(b.friend_handle));
}

export async function listFriendRequests(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select("*, profiles:requested_by(handle)")
    .eq("status", "pending")
    .neq("requested_by", profileId)
    .or(`a_id.eq.${profileId},b_id.eq.${profileId}`)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const from = row.profiles as unknown as { handle: string } | null;
    return {
      ...(row as unknown as Friendship),
      from_handle: from?.handle ?? "unknown",
    };
  });
}

export async function requestFriend(fromId: string, toId: string) {
  if (fromId === toId) throw new Error("Cannot friend yourself");
  if (await isBlockedEither(fromId, toId)) throw new Error("Blocked");
  const [a, b] = pairIds(fromId, toId);
  const supabase = await createClient();
  const { error } = await supabase.from("friendships").upsert(
    {
      a_id: a,
      b_id: b,
      status: "pending",
      requested_by: fromId,
    },
    { onConflict: "a_id,b_id", ignoreDuplicates: true },
  );
  if (error) throw error;
  await touchStreak(fromId);
}

export async function acceptFriend(profileId: string, friendshipId: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();
  if (!row || row.status !== "pending") throw new Error("Not found");
  if (row.requested_by === profileId) throw new Error("Cannot accept own request");
  if (row.a_id !== profileId && row.b_id !== profileId) {
    throw new Error("Not yours");
  }
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);
  if (error) throw error;
  await touchStreak(profileId);
}

export async function sendWave(fromId: string, toId: string) {
  if (fromId === toId) throw new Error("Cannot wave at yourself");
  if (await isBlockedEither(fromId, toId)) throw new Error("Blocked");
  const supabase = await createClient();
  const { error } = await supabase.from("waves").upsert(
    {
      from_id: fromId,
      to_id: toId,
      created_at: new Date().toISOString(),
    },
    { onConflict: "from_id,to_id" },
  );
  if (error) throw error;
  await touchStreak(fromId);
}

export async function listWavesFor(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("waves")
    .select("*, profiles:from_id(handle)")
    .eq("to_id", profileId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((row) => {
    const from = row.profiles as unknown as { handle: string } | null;
    return {
      ...(row as unknown as Wave),
      from_handle: from?.handle ?? "unknown",
    };
  });
}

export async function hasWaved(fromId: string, toId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("waves")
    .select("id")
    .eq("from_id", fromId)
    .eq("to_id", toId)
    .maybeSingle();
  return Boolean(data);
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new Error("Cannot block yourself");
  const supabase = await createClient();
  await supabase.from("blocks").upsert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  const [a, b] = pairIds(blockerId, blockedId);
  await supabase.from("friendships").delete().eq("a_id", a).eq("b_id", b);
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const supabase = await createClient();
  await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
}

export async function muteUser(muterId: string, mutedId: string) {
  if (muterId === mutedId) throw new Error("Cannot mute yourself");
  const supabase = await createClient();
  await supabase.from("mutes").upsert({
    muter_id: muterId,
    muted_id: mutedId,
  });
}

export async function unmuteUser(muterId: string, mutedId: string) {
  const supabase = await createClient();
  await supabase
    .from("mutes")
    .delete()
    .eq("muter_id", muterId)
    .eq("muted_id", mutedId);
}

export async function reportUser(
  reporterId: string,
  reportedId: string,
  reason: string,
) {
  if (reporterId === reportedId) throw new Error("Cannot report yourself");
  const cleaned = reason.trim().slice(0, 280);
  if (!cleaned) throw new Error("Reason required");
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason: cleaned,
  });
  if (error) throw error;
}

export async function listBlocks(blockerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id, created_at, profiles:blocked_id(handle)")
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { handle: string } | null;
    return {
      blocked_id: row.blocked_id as string,
      handle: profile?.handle ?? "unknown",
      created_at: row.created_at as string,
    };
  });
}

export async function listMutes(muterId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mutes")
    .select("muted_id, created_at, profiles:muted_id(handle)")
    .eq("muter_id", muterId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { handle: string } | null;
    return {
      muted_id: row.muted_id as string,
      handle: profile?.handle ?? "unknown",
      created_at: row.created_at as string,
    };
  });
}

export async function sendMessage(
  senderId: string,
  recipientId: string,
  body: string,
) {
  if (senderId === recipientId) throw new Error("Cannot message yourself");
  if (await isBlockedEither(senderId, recipientId)) throw new Error("Blocked");
  const cleaned = body.trim().slice(0, 1000);
  if (!cleaned) throw new Error("Empty message");
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    sender_id: senderId,
    recipient_id: recipientId,
    body: cleaned,
  });
  if (error) throw error;
  await touchStreak(senderId);
}

export async function listConversations(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${profileId},recipient_id.eq.${profileId}`)
    .order("created_at", { ascending: false });

  const latest = new Map<
    string,
    { other_id: string; last_at: string; last_body: string }
  >();
  for (const row of data ?? []) {
    const otherId =
      row.sender_id === profileId
        ? (row.recipient_id as string)
        : (row.sender_id as string);
    if (latest.has(otherId)) continue;
    if (await isBlockedEither(profileId, otherId)) continue;
    if (await isMuted(profileId, otherId)) continue;
    latest.set(otherId, {
      other_id: otherId,
      last_at: row.created_at as string,
      last_body: row.body as string,
    });
  }

  const out = [];
  for (const item of latest.values()) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", item.other_id)
      .maybeSingle();
    out.push({
      ...item,
      other_handle: profile?.handle ?? "unknown",
    });
  }
  return out.sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export async function listThread(
  profileId: string,
  otherId: string,
): Promise<Message[]> {
  if (await isBlockedEither(profileId, otherId)) return [];
  const supabase = await createClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profileId)
    .eq("sender_id", otherId)
    .is("read_at", null);

  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${profileId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${profileId})`,
    )
    .order("created_at", { ascending: true });

  return (data as Message[]) ?? [];
}

export async function friendshipStatus(
  meId: string,
  otherId: string,
): Promise<"none" | "pending_out" | "pending_in" | "friends"> {
  const [a, b] = pairIds(meId, otherId);
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("friendships")
    .select("*")
    .eq("a_id", a)
    .eq("b_id", b)
    .maybeSingle();
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  return row.requested_by === meId ? "pending_out" : "pending_in";
}
