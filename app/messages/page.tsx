import { getSessionProfileId } from "@/lib/session";
import { listConversations } from "@/lib/social";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const meId = await getSessionProfileId();
  if (!meId) redirect("/login");
  const conversations = await listConversations(meId);

  return (
    <section className="stack">
      <h1 className="page-title">Messages</h1>
      <div className="feed-list">
        {conversations.length === 0 ? (
          <p className="meta">No conversations yet. Message someone from their profile.</p>
        ) : (
          conversations.map((c) => (
            <Link
              key={c.other_id}
              href={`/messages/${c.other_handle}`}
              className="panel row-between"
            >
              <div>
                <strong>@{c.other_handle}</strong>
                <p className="meta">{c.last_body}</p>
              </div>
              <span className="meta">{c.last_at.slice(0, 10)}</span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
