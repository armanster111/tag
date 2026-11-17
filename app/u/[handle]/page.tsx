import {
  blockProfile,
  endorseProfileTag,
  friendRequest,
  muteProfile,
  reportProfile,
  waveAt,
} from "@/app/actions";
import { RankBadge } from "@/components/RankBadge";
import { TagChip } from "@/components/TagChip";
import { getProfileWithTagsByHandle } from "@/lib/profiles";
import { getSessionProfileId } from "@/lib/session";
import {
  friendshipStatus,
  hasWaved,
  listWavesFor,
} from "@/lib/social";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ error?: string; reported?: string }>;
}) {
  const { handle } = await params;
  const query = await searchParams;
  const profile = await getProfileWithTagsByHandle(handle);
  if (!profile) notFound();

  const sessionId = await getSessionProfileId();
  const isOwner = sessionId === profile.id;
  const secondaries = profile.tags.filter((t) => !t.is_primary);
  const status = sessionId
    ? await friendshipStatus(sessionId, profile.id)
    : "none";
  const waved =
    sessionId && !isOwner ? await hasWaved(sessionId, profile.id) : false;
  const waves = isOwner ? await listWavesFor(profile.id) : [];

  return (
    <section className={`panel ${profile.banner}`}>
      <div className="profile-card-top">
        <div>
          <h1 className="page-title">@{profile.handle}</h1>
          {profile.title ? <div className="title-pill">{profile.title}</div> : null}
        </div>
        <RankBadge rank={profile.rank} />
      </div>

      {profile.bio ? <p className="bio-line">{profile.bio}</p> : null}
      {profile.looking_for ? (
        <p className="looking-for">
          Looking for:{" "}
          <Link href={`/looking?q=${encodeURIComponent(profile.looking_for)}`}>
            {profile.looking_for}
          </Link>
        </p>
      ) : null}

      <p className="meta" style={{ marginBottom: "0.85rem" }}>
        Rank {profile.rank} · season +{profile.season_points} · streak{" "}
        {profile.streak_count}d
      </p>

      {query.reported ? <p className="meta">Report submitted.</p> : null}
      {query.error ? <p className="error">Could not complete that action.</p> : null}

      <div className="tag-row" style={{ marginBottom: "1rem" }}>
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

      {profile.subtags.length > 0 ? (
        <div className="tag-row" style={{ marginBottom: "1rem" }}>
          {profile.subtags.map((sub) => (
            <Link
              key={sub.slug}
              href={`/t/${encodeURIComponent(sub.parent_slug)}?sub=${encodeURIComponent(sub.slug)}`}
              className="subtag-chip active"
            >
              {sub.label}
            </Link>
          ))}
        </div>
      ) : null}

      {profile.endorsements.length > 0 ? (
        <div className="endorse-list">
          <h2 className="section-title">Endorsements</h2>
          <ul>
            {profile.endorsements.map((e) => (
              <li key={e.id}>
                @{e.from_handle} endorsed <strong>{e.tag}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isOwner && waves.length > 0 ? (
        <div className="endorse-list">
          <h2 className="section-title">Waves</h2>
          <ul>
            {waves.map((w) => (
              <li key={w.id}>
                @{w.from_handle} waved
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isOwner ? (
        <p className="meta" style={{ marginTop: "1rem" }}>
          <Link href={`/u/${profile.handle}/edit`}>Edit your profile</Link>
        </p>
      ) : sessionId ? (
        <div className="action-grid">
          {profile.tags.map((tag) => (
            <form key={tag.id} action={endorseProfileTag}>
              <input type="hidden" name="handle" value={profile.handle} />
              <input type="hidden" name="tag" value={tag.tag} />
              <button type="submit" className="btn subtle">
                Endorse {tag.tag}
              </button>
            </form>
          ))}

          <form action={waveAt}>
            <input type="hidden" name="handle" value={profile.handle} />
            <button type="submit" className="btn subtle" disabled={waved}>
              {waved ? "Waved" : "Wave"}
            </button>
          </form>

          {status === "none" ? (
            <form action={friendRequest}>
              <input type="hidden" name="handle" value={profile.handle} />
              <button type="submit" className="btn subtle">
                Add friend
              </button>
            </form>
          ) : (
            <span className="meta">
              {status === "friends"
                ? "Friends"
                : status === "pending_out"
                  ? "Friend request sent"
                  : "Friend request pending"}
            </span>
          )}

          <Link className="btn subtle" href={`/messages/${profile.handle}`}>
            Message
          </Link>

          <form action={muteProfile}>
            <input type="hidden" name="handle" value={profile.handle} />
            <button type="submit" className="linkish">
              Mute
            </button>
          </form>
          <form action={blockProfile}>
            <input type="hidden" name="handle" value={profile.handle} />
            <button type="submit" className="linkish">
              Block
            </button>
          </form>

          <form action={reportProfile} className="stack-form report-form">
            <input type="hidden" name="handle" value={profile.handle} />
            <label>
              Report
              <input
                name="reason"
                required
                maxLength={280}
                placeholder="Why are you reporting?"
              />
            </label>
            <button type="submit" className="linkish">
              Submit report
            </button>
          </form>
        </div>
      ) : (
        <p className="meta">
          <Link href="/login">Log in</Link> to endorse, wave, or message.
        </p>
      )}
    </section>
  );
}
