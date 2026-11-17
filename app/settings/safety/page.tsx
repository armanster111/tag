import { unblockProfile, unmuteProfile } from "@/app/actions";
import { getSessionProfileId } from "@/lib/session";
import { listBlocks, listMutes } from "@/lib/social";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SafetyPage() {
  const meId = await getSessionProfileId();
  if (!meId) redirect("/login");

  const blocks = await listBlocks(meId);
  const mutes = await listMutes(meId);

  return (
    <section className="stack">
      <h1 className="page-title">Safety</h1>
      <p className="lede">Blocked and muted people stay out of your feed and DMs.</p>

      <section className="panel">
        <h2 className="section-title">Blocked</h2>
        {blocks.length === 0 ? (
          <p className="meta">Nobody blocked.</p>
        ) : (
          <ul className="plain-list">
            {blocks.map((b) => (
              <li key={b.blocked_id} className="row-between">
                <span>@{b.handle}</span>
                <form action={unblockProfile}>
                  <input type="hidden" name="profile_id" value={b.blocked_id} />
                  <button type="submit" className="linkish">
                    Unblock
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title">Muted</h2>
        {mutes.length === 0 ? (
          <p className="meta">Nobody muted.</p>
        ) : (
          <ul className="plain-list">
            {mutes.map((m) => (
              <li key={m.muted_id} className="row-between">
                <span>@{m.handle}</span>
                <form action={unmuteProfile}>
                  <input type="hidden" name="profile_id" value={m.muted_id} />
                  <button type="submit" className="linkish">
                    Unmute
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
