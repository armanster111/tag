import { castSpotlightVote } from "@/app/actions";
import { listSpotlightCandidates } from "@/lib/game";
import { getSessionProfileId } from "@/lib/session";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SpotlightsPage() {
  const candidates = await listSpotlightCandidates();
  const meId = await getSessionProfileId();

  return (
    <section className="stack">
      <h1 className="page-title">Community spotlights</h1>
      <p className="lede">
        One vote per person per season. Change your vote anytime.
      </p>
      <div className="feed-list">
        {candidates.map((c) => (
          <article key={c.profile_id} className="panel row-between">
            <div>
              <Link href={`/u/${c.handle}`} className="handle">
                @{c.handle}
              </Link>
              <p className="bio-line">{c.bio || "—"}</p>
              <p className="meta">
                {c.votes} votes · rank {c.rank}
              </p>
            </div>
            {meId && meId !== c.profile_id ? (
              <form action={castSpotlightVote}>
                <input type="hidden" name="handle" value={c.handle} />
                <button type="submit" className="btn subtle">
                  Vote
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
