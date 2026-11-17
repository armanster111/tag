import { listTaxonomyByCategory } from "@/lib/taxonomy";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TagsIndexPage() {
  const groups = await listTaxonomyByCategory();

  return (
    <section className="stack">
      <div>
        <h1 className="page-title">Tag taxonomy</h1>
        <p className="lede">
          Curated interests grouped by category. Profiles pick from this list
          only — some tags also have fixed sub-tags on their pages.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.category} className="panel">
          <h2 className="section-title">{group.label}</h2>
          <div className="tag-row">
            {group.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/t/${encodeURIComponent(tag.slug)}`}
                className="tag-chip"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
