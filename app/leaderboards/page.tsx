import { adminResetSeason } from "@/app/actions";
import { listTagLeaderboard } from "@/lib/game";
import { listTagCloud } from "@/lib/profiles";
import { getSessionProfileId } from "@/lib/session";
import { normalizeTag } from "@/lib/tags";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; bracket?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const cloud = await listTagCloud();
  const tag = normalizeTag(params.tag || cloud[0]?.tag || "chess");
  const bracket =
    params.bracket === "beginner" || params.bracket === "open"
      ? params.bracket
      : "all";
  const entries = await listTagLeaderboard(tag, bracket);
  const meId = await getSessionProfileId();

  return (
    <section className="stack">
      <h1 className="page-title">Tag leaderboards</h1>
      <p className="lede">
        Top ten per tag. Beginner bracket is tags ≤30 days old or level ≤3 so
        new skills do not fight veterans.
      </p>
      {params.reset ? <p className="meta">Season reset — points cleared.</p> : null}

      <div className="feed-tabs">
        {cloud.map((item) => (
          <Link
            key={item.tag}
            href={`/leaderboards?tag=${encodeURIComponent(item.tag)}&bracket=${bracket}`}
            className={item.tag === tag ? "tab active" : "tab"}
          >
            {item.tag}
          </Link>
        ))}
      </div>

      <div className="feed-tabs">
        <Link
          href={`/leaderboards?tag=${tag}&bracket=all`}
          className={bracket === "all" ? "tab active" : "tab"}
        >
          All
        </Link>
        <Link
          href={`/leaderboards?tag=${tag}&bracket=open`}
          className={bracket === "open" ? "tab active" : "tab"}
        >
          Open
        </Link>
        <Link
          href={`/leaderboards?tag=${tag}&bracket=beginner`}
          className={bracket === "beginner" ? "tab active" : "tab"}
        >
          Beginner
        </Link>
      </div>

      <ol className="panel plain-list board-list">
        {entries.length === 0 ? (
          <li className="meta">No entries in this bracket.</li>
        ) : (
          entries.map((entry, i) => (
            <li key={`${entry.profile_id}-${entry.tag}`} className="row-between">
              <span>
                #{i + 1}{" "}
                <Link href={`/u/${entry.handle}`}>@{entry.handle}</Link>{" "}
                <span className="meta">({entry.bracket})</span>
              </span>
              <strong>{entry.level}</strong>
            </li>
          ))
        )}
      </ol>

      {meId ? (
        <form action={adminResetSeason}>
          <button type="submit" className="btn subtle">
            Reset season (demo)
          </button>
        </form>
      ) : null}
    </section>
  );
}
