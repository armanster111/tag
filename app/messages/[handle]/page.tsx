import { sendDm } from "@/app/actions";
import { getProfileByHandle } from "@/lib/profiles";
import { getSessionProfileId } from "@/lib/session";
import { listThread } from "@/lib/social";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const meId = await getSessionProfileId();
  if (!meId) redirect("/login");

  const { handle } = await params;
  const other = await getProfileByHandle(handle);
  if (!other) notFound();

  const messages = await listThread(meId, other.id);

  return (
    <section className="stack">
      <h1 className="page-title">
        Chat with <Link href={`/u/${other.handle}`}>@{other.handle}</Link>
      </h1>
      <div className="panel thread">
        {messages.length === 0 ? (
          <p className="meta">Say hello.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={m.sender_id === meId ? "bubble mine" : "bubble theirs"}
            >
              <p>{m.body}</p>
              <span className="meta">{m.created_at.replace("T", " ").slice(0, 16)}</span>
            </div>
          ))
        )}
      </div>
      <form action={sendDm} className="stack-form panel">
        <input type="hidden" name="handle" value={other.handle} />
        <label>
          Message
          <input name="body" required maxLength={1000} placeholder="Write a note…" />
        </label>
        <button type="submit" className="btn">
          Send
        </button>
      </form>
    </section>
  );
}
