import { ProfileCard } from "@/components/ProfileCard";
import { listByTag } from "@/lib/profiles";
import { normalizeTag } from "@/lib/tags";
import {
  CATEGORY_LABELS,
  getTaxonomyTag,
  listRelatedInCategory,
} from "@/lib/taxonomy";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ level?: string }>;
}) {
  const { tag: rawTag } = await params;
  const query = await searchParams;
  const tag = normalizeTag(decodeURIComponent(rawTag));
  const meta = await getTaxonomyTag(tag);
  if (!meta) notFound();

  const levelParam = query.level ? Number(query.level) : undefined;
  const level =
    levelParam && levelParam >= 1 && levelParam <= 10 ? levelParam : undefined;

  const profiles = await listByTag(tag, level);
  const related = await listRelatedInCategory(tag);

  return (
    <section className="stack">
      <div>
        <p className="meta">
          <Link href="/tags">{CATEGORY_LABELS[meta.category]}</Link>
        </p>
        <h1 className="page-title">{meta.label}</h1>
        <p className="lede">
          {level
            ? `Everyone at ${meta.label} level ${level}.`
            : `Everyone with the ${meta.label} tag. Filter by level:`}
        </p>
      </div>
      <div className="level-filters">
        <Link
          href={`/t/${encodeURIComponent(tag)}`}
          className={level == null ? "active" : undefined}
        >
          All
        </Link>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Link
            key={n}
            href={`/t/${encodeURIComponent(tag)}?level=${n}`}
            className={level === n ? "active" : undefined}
          >
            {n}
          </Link>
        ))}
      </div>
      <div className="feed-list">
        {profiles.length === 0 ? (
          <p className="meta">
            No profiles at this tag{level ? ` / ${level}` : ""}.
          </p>
        ) : (
          profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))
        )}
      </div>
      {related.length > 0 ? (
        <section className="panel">
          <h2 className="section-title">
            More in {CATEGORY_LABELS[meta.category]}
          </h2>
          <div className="tag-row">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/t/${encodeURIComponent(item.slug)}`}
                className="tag-chip"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
