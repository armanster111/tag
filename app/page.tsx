import { FeedTabs } from "@/components/FeedTabs";
import { ProfileCard } from "@/components/ProfileCard";
import { TagCloud } from "@/components/TagCloud";
import {
  listFeed,
  listSimilarTo,
  listTagCloud,
} from "@/lib/profiles";
import { getSessionProfileId } from "@/lib/session";
import type { FeedSort, RisingProfile } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort: FeedSort =
    params.sort === "active"
      ? "active"
      : params.sort === "rising"
        ? "rising"
        : "newest";
  const meId = await getSessionProfileId();
  const profiles = await listFeed(sort, meId);
  const cloud = await listTagCloud();
  const similar = meId ? await listSimilarTo(meId) : [];

  return (
    <section className="stack">
      <div>
        <h1 className="page-title">Community</h1>
        <p className="lede">
          Rank is the sum of tag levels. Endorsements can bump a level.
          Discover people through tags, looking-for, and rising ranks.
        </p>
      </div>

      <TagCloud items={cloud} />

      {similar.length > 0 ? (
        <section className="panel">
          <h2 className="section-title">Similar to you</h2>
          <div className="feed-list">
            {similar.map((profile) => (
              <div key={profile.id}>
                <ProfileCard profile={profile} />
                <p className="meta">
                  Shared: {profile.shared_tags.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <FeedTabs sort={sort} />
      <div className="feed-list">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            rankDelta={
              sort === "rising"
                ? (profile as RisingProfile).rank_delta
                : undefined
            }
          />
        ))}
      </div>

      <p className="meta">
        Also browse <Link href="/looking">looking-for</Link>,{" "}
        <Link href="/leaderboards">tag boards</Link>, and{" "}
        <Link href="/spotlights">spotlights</Link>.
      </p>
    </section>
  );
}
