"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TaxonomySubtag } from "@/lib/taxonomy-data";

export function SubtagBrowse({
  parentSlug,
  subtags,
  activeSubtag,
  level,
}: {
  parentSlug: string;
  subtags: TaxonomySubtag[];
  activeSubtag?: string;
  level?: number;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      subtags.filter(
        (s) =>
          !q ||
          s.slug.includes(q) ||
          s.label.toLowerCase().includes(q),
      ),
    [subtags, q],
  );

  function hrefFor(sub?: string) {
    const params = new URLSearchParams();
    if (level != null) params.set("level", String(level));
    if (sub) params.set("sub", sub);
    const qs = params.toString();
    return `/t/${encodeURIComponent(parentSlug)}${qs ? `?${qs}` : ""}`;
  }

  if (subtags.length === 0) return null;

  return (
    <section className="panel subtag-browse">
      <h2 className="section-title">Sub-tags</h2>
      <p className="hint">Search the curated list, then filter profiles.</p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a sub-tag…"
        aria-label="Filter sub-tags"
      />
      <div className="tag-row" style={{ marginTop: "0.75rem" }}>
        <Link
          href={hrefFor()}
          className={`subtag-chip${activeSubtag ? "" : " active"}`}
        >
          All
        </Link>
        {matches.map((sub) => (
          <Link
            key={sub.slug}
            href={hrefFor(sub.slug)}
            className={`subtag-chip${activeSubtag === sub.slug ? " active" : ""}`}
          >
            {sub.label}
          </Link>
        ))}
      </div>
      {matches.length === 0 ? (
        <p className="meta" style={{ marginTop: "0.5rem" }}>
          No sub-tags match that search.
        </p>
      ) : null}
    </section>
  );
}
