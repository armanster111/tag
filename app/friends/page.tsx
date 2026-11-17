import { friendAccept } from "@/app/actions";
import { getSessionProfileId } from "@/lib/session";
import { listFriendRequests, listFriends } from "@/lib/social";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const meId = await getSessionProfileId();
  if (!meId) redirect("/login");

  const friends = await listFriends(meId);
  const requests = await listFriendRequests(meId);

  return (
    <section className="stack">
      <h1 className="page-title">Friends</h1>

      {requests.length > 0 ? (
        <section className="panel">
          <h2 className="section-title">Requests</h2>
          <ul className="plain-list">
            {requests.map((req) => (
              <li key={req.id} className="row-between">
                <Link href={`/u/${req.from_handle}`}>@{req.from_handle}</Link>
                <form action={friendAccept}>
                  <input type="hidden" name="friendship_id" value={req.id} />
                  <button type="submit" className="btn subtle">
                    Accept
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <h2 className="section-title">Your list</h2>
        {friends.length === 0 ? (
          <p className="meta">No friends yet.</p>
        ) : (
          <ul className="plain-list">
            {friends.map((f) => (
              <li key={f.id} className="row-between">
                <Link href={`/u/${f.friend_handle}`}>@{f.friend_handle}</Link>
                <Link href={`/messages/${f.friend_handle}`}>Message</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
