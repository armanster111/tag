import Link from "next/link";
import type { ProfileWithTags, RisingProfile } from "@/lib/types";
import { RankBadge } from "./RankBadge";
import { TagChip } from "./TagChip";

export function ProfileCard({
  profile,
  rankDelta,
}: {
  profile: ProfileWithTags | RisingProfile;
  rankDelta?: number;
}) {
  const secondaries = profile.tags.filter((t) => !t.is_primary);
  const delta =
    rankDelta ??
    ("rank_delta" in profile ? (profile as RisingProfile).rank_delta : undefined);

  return (
    <article className={`profile-card ${profile.banner}`}>
      <div className="profile-card-top">
        <div>
          <Link href={`/u/${profile.handle}`} className="handle">
            @{profile.handle}
          </Link>
          {profile.title ? <div className="title-pill">{profile.title}</div> : null}
        </div>
        <div className="rank-stack">
          <RankBadge rank={profile.rank} />
          {delta != null && delta > 0 ? (
            <span className="delta">+{delta} this week</span>
          ) : null}
        </div>
      </div>
      {profile.bio ? <p className="bio-line">{profile.bio}</p> : null}
      {profile.looking_for ? (
        <p className="looking-for">
          Looking for:{" "}
          <Link
            href={`/looking?q=${encodeURIComponent(profile.looking_for)}`}
          >
            {profile.looking_for}
          </Link>
        </p>
      ) : null}
      <div className="tag-row">
        {profile.primary_tag ? (
          <TagChip
            tag={profile.primary_tag.tag}
            level={profile.primary_tag.level}
            primary
            endorsements={profile.primary_tag.endorsement_count}
          />
        ) : null}
        {secondaries.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag.tag}
            level={tag.level}
            endorsements={tag.endorsement_count}
          />
        ))}
      </div>
      {profile.streak_count > 0 ? (
        <p className="meta streak">{profile.streak_count}-day streak</p>
      ) : null}
    </article>
  );
}
