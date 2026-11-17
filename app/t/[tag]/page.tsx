import { ProfileCard } from "@/components/ProfileCard";
import { SubtagBrowse } from "@/components/SubtagBrowse";
import { listByTag } from "@/lib/profiles";
import { normalizeTag } from "@/lib/tags";
import {
  CATEGORY_LABELS,
  getTaxonomySubtag,
  getTaxonomyTag,
  listRelatedInCategory,
  listSubtagsForParent,
} from "@/lib/taxonomy";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ level?: string; sub?: string }>;
}) {
  const { tag: rawTag } = await params;
  const query = await searchParams;
  const tag = normalizeTag(decodeURIComponent(rawTag));
  const meta = await getTaxonomyTag(tag);
  if (!meta) notFound();

  const levelParam = query.level ? Number(query.level) : undefined;
  const level =
    levelParam && levelParam >= 1 && levelParam <= 10 ? levelParam : undefined;

  const subtags = await listSubtagsForParent(tag);
  const activeSub = query.sub ? normalizeTag(query.sub) : undefined;
  const activeSubMeta = activeSub
    ? await getTaxonomySubtag(activeSub)
    : null;
  if (
    activeSub &&
    (!activeSubMeta || activeSubMeta.parent_slug !== tag)
  ) {
    notFound();
  }

  const profiles = await listByTag(tag, level, null, activeSub);
  const related = await listRelatedInCategory(tag);

  function levelHref(n?: number) {
    const params = new URLSearchParams();
    if (n != null) params.set("level", String(n));
    if (activeSub) params.set("sub", activeSub);
    const qs = params.toString();
    return `/t/${encodeURIComponent(tag)}${qs ? `?${qs}` : ""}`;
  }

  return (
    <section className="stack">
      <div>
        <p className="meta">
          <Link href="/tags">{CATEGORY_LABELS[meta.category]}</Link>
        </p>
        <h1 className="page-title">{meta.label}</h1>
        <p className="lede">
          {activeSubMeta
            ? level
              ? `Everyone with ${meta.label} → ${activeSubMeta.label} at level ${level}.`
              : `Everyone with ${meta.label} → ${activeSubMeta.label}.`
            : level
              ? `Everyone at ${meta.label} level ${level}.`
              : `Everyone with the ${meta.label} tag. Filter by level or sub-tag:`}
        </p>
      </div>
      <div className="level-filters">
        <Link
          href={levelHref()}
          className={level == null ? "active" : undefined}
        >
          All
        </Link>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Link
            key={n}
            href={levelHref(n)}
            className={level === n ? "active" : undefined}
          >
            {n}
          </Link>
        ))}
      </div>

      <SubtagBrowse
        parentSlug={tag}
        subtags={subtags}
        activeSubtag={activeSub}
        level={level}
      />

      <div className="feed-list">
        {profiles.length === 0 ? (
          <p className="meta">
            No profiles at this tag
            {activeSubMeta ? ` / ${activeSubMeta.label}` : ""}
            {level ? ` / ${level}` : ""}.
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
