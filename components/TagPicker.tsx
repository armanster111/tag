"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  type TaxonomyCategory,
  type TaxonomySubtag,
  type TaxonomyTag,
} from "@/lib/taxonomy-data";

type Picked = { slug: string; level: number };

export function TagFields({
  taxonomy,
  subtags = [],
  defaultPrimary,
  defaultPrimaryLevel = 5,
  defaultSecondaries = [],
  defaultSubtags = [],
}: {
  taxonomy: TaxonomyTag[];
  subtags?: TaxonomySubtag[];
  defaultPrimary?: string;
  defaultPrimaryLevel?: number;
  defaultSecondaries?: Picked[];
  defaultSubtags?: string[];
}) {
  const [primary, setPrimary] = useState(defaultPrimary ?? "");
  const [primaryLevel, setPrimaryLevel] = useState(defaultPrimaryLevel);
  const [secondaries, setSecondaries] = useState<Picked[]>(defaultSecondaries);
  const [selectedSubtags, setSelectedSubtags] = useState<string[]>(
    defaultSubtags,
  );

  const used = useMemo(() => {
    const set = new Set(secondaries.map((s) => s.slug).filter(Boolean));
    if (primary) set.add(primary);
    return set;
  }, [primary, secondaries]);

  const parentSlugs = useMemo(() => {
    return [...used].filter(Boolean);
  }, [used]);

  const availableByParent = useMemo(() => {
    const map = new Map<string, TaxonomySubtag[]>();
    for (const sub of subtags) {
      if (!parentSlugs.includes(sub.parent_slug)) continue;
      const list = map.get(sub.parent_slug) ?? [];
      list.push(sub);
      map.set(sub.parent_slug, list);
    }
    return map;
  }, [subtags, parentSlugs]);

  const labelFor = (slug: string) =>
    taxonomy.find((t) => t.slug === slug)?.label ?? slug;

  function toggleSubtag(slug: string) {
    setSelectedSubtags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  useEffect(() => {
    setSelectedSubtags((prev) => {
      const next = prev.filter((slug) => {
        const meta = subtags.find((s) => s.slug === slug);
        return Boolean(meta && parentSlugs.includes(meta.parent_slug));
      });
      return next.length === prev.length ? prev : next;
    });
  }, [parentSlugs, subtags]);

  return (
    <div className="tag-fields">
      <input type="hidden" name="primary_tag" value={primary} />
      <input type="hidden" name="primary_level" value={primaryLevel} />
      <input
        type="hidden"
        name="secondary_tags"
        value={secondaries
          .filter((s) => s.slug)
          .map((s) => `${s.slug}:${s.level}`)
          .join(",")}
      />
      <input type="hidden" name="subtags" value={selectedSubtags.join(",")} />

      <label>
        Primary tag
        <TagTypeahead
          taxonomy={taxonomy}
          exclude={used}
          allowSlug={primary || undefined}
          value={primary}
          onChange={setPrimary}
          placeholder="Search taxonomy…"
          required
        />
      </label>
      <label>
        Primary level (1–10)
        <input
          type="number"
          min={1}
          max={10}
          value={primaryLevel}
          onChange={(e) => setPrimaryLevel(Number(e.target.value))}
          required
        />
      </label>

      <div className="secondary-block">
        <div className="row-between">
          <span>Secondary tags</span>
          <button
            type="button"
            className="linkish"
            onClick={() =>
              setSecondaries((prev) => [...prev, { slug: "", level: 3 }])
            }
          >
            + Add
          </button>
        </div>
        {secondaries.length === 0 ? (
          <p className="hint">Optional — pick more interests from the list.</p>
        ) : null}
        {secondaries.map((row, index) => (
          <div key={index} className="secondary-row">
            <TagTypeahead
              taxonomy={taxonomy}
              exclude={used}
              allowSlug={row.slug || undefined}
              value={row.slug}
              onChange={(slug) =>
                setSecondaries((prev) =>
                  prev.map((item, i) =>
                    i === index ? { ...item, slug } : item,
                  ),
                )
              }
              placeholder="Search…"
            />
            <input
              type="number"
              min={1}
              max={10}
              value={row.level}
              aria-label="Level"
              onChange={(e) =>
                setSecondaries((prev) =>
                  prev.map((item, i) =>
                    i === index
                      ? { ...item, level: Number(e.target.value) }
                      : item,
                  ),
                )
              }
            />
            <button
              type="button"
              className="linkish"
              onClick={() =>
                setSecondaries((prev) => prev.filter((_, i) => i !== index))
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {[...availableByParent.entries()].map(([parent, options]) => (
        <SubtagPicker
          key={parent}
          parentLabel={labelFor(parent)}
          options={options}
          selected={selectedSubtags}
          onToggle={toggleSubtag}
        />
      ))}
    </div>
  );
}

function SubtagPicker({
  parentLabel,
  options,
  selected,
  onToggle,
}: {
  parentLabel: string;
  options: TaxonomySubtag[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = options.filter(
    (s) =>
      !q ||
      s.slug.includes(q) ||
      s.label.toLowerCase().includes(q),
  );

  return (
    <div className="subtag-block">
      <div className="row-between">
        <span>Sub-tags for {parentLabel}</span>
      </div>
      <p className="hint">Optional — pick fixed children from the list.</p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Filter ${parentLabel} sub-tags…`}
        aria-label={`Filter ${parentLabel} sub-tags`}
      />
      <div className="subtag-options">
        {matches.length === 0 ? (
          <p className="meta">No matching sub-tags.</p>
        ) : (
          matches.map((sub) => {
            const on = selected.includes(sub.slug);
            return (
              <button
                key={sub.slug}
                type="button"
                className={`subtag-chip${on ? " active" : ""}`}
                onClick={() => onToggle(sub.slug)}
                aria-pressed={on}
              >
                {sub.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function TagTypeahead({
  taxonomy,
  value,
  onChange,
  placeholder,
  required,
  exclude,
  allowSlug,
}: {
  taxonomy: TaxonomyTag[];
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  required?: boolean;
  exclude: Set<string>;
  allowSlug?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = taxonomy.find((t) => t.slug === value);
  const q = query.trim().toLowerCase();
  const matches = taxonomy
    .filter((t) => !exclude.has(t.slug) || t.slug === allowSlug)
    .filter(
      (t) =>
        !q ||
        t.slug.includes(q) ||
        t.label.toLowerCase().includes(q) ||
        t.category.includes(q),
    )
    .slice(0, 10);

  return (
    <div className="typeahead">
      <input
        type="text"
        value={
          open
            ? query
            : selected
              ? `${selected.label} (${CATEGORY_LABELS[selected.category]})`
              : query
        }
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        placeholder={placeholder}
        required={required && !value}
        autoComplete="off"
      />
      {open ? (
        <ul className="typeahead-menu">
          {matches.length === 0 ? (
            <li className="meta">No matches in the curated list.</li>
          ) : (
            matches.map((tag) => (
              <li key={tag.slug}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(tag.slug);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <strong>{tag.label}</strong>
                  <span className="meta">
                    {CATEGORY_LABELS[tag.category as TaxonomyCategory]}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
