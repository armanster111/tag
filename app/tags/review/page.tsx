import {
  approveTagSuggestion,
  rejectTagSuggestion,
} from "@/app/actions";
import { getSessionProfileId } from "@/lib/session";
import {
  CATEGORY_LABELS,
  listPendingSuggestions,
  type TaxonomyCategory,
} from "@/lib/taxonomy";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TagReviewPage() {
  const meId = await getSessionProfileId();
  if (!meId) redirect("/login");

  const pending = await listPendingSuggestions();
  const categories = Object.keys(CATEGORY_LABELS) as TaxonomyCategory[];

  return (
    <section className="stack">
      <div>
        <h1 className="page-title">Pending tag suggestions</h1>
        <p className="lede">
          Approve into a category or reject. Approved tags join the taxonomy
          immediately.
        </p>
        <p className="meta">
          <Link href="/tags">Back to taxonomy</Link>
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="meta">Queue is empty.</p>
      ) : (
        pending.map((item) => (
          <article key={item.id} className="panel">
            <h2 className="section-title">{item.label}</h2>
            <p className="meta">
              slug <code>{item.slug}</code>
              {item.suggester_handle
                ? ` · by @${item.suggester_handle}`
                : " · anonymous"}
              {item.category ? ` · guessed ${item.category}` : ""}
            </p>
            {item.note ? <p className="bio-line">{item.note}</p> : null}
            <div className="action-grid">
              <form action={approveTagSuggestion} className="stack-form">
                <input type="hidden" name="id" value={item.id} />
                <label>
                  Category
                  <select
                    name="category"
                    defaultValue={item.category ?? "creative"}
                    required
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn subtle">
                  Approve
                </button>
              </form>
              <form action={rejectTagSuggestion}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="linkish">
                  Reject
                </button>
              </form>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
