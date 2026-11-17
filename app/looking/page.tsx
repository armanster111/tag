import { ProfileCard } from "@/components/ProfileCard";
import { listByLookingFor } from "@/lib/profiles";
import { getSessionProfileId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LookingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const meId = await getSessionProfileId();
  const profiles = q.trim() ? await listByLookingFor(q, meId) : [];

  return (
    <section className="stack">
      <div>
        <h1 className="page-title">Looking for</h1>
        <p className="lede">
          Filter profiles by what they want — chess partner, photo buddy, etc.
        </p>
      </div>
      <form className="stack-form panel">
        <label>
          Search
          <input name="q" defaultValue={q} placeholder="chess, hike, photo…" />
        </label>
        <button type="submit" className="btn">
          Search
        </button>
      </form>
      <div className="feed-list">
        {q.trim() && profiles.length === 0 ? (
          <p className="meta">No matches.</p>
        ) : (
          profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))
        )}
      </div>
    </section>
  );
}
