"use client";

import { useState } from "react";
import { suggestNewTag } from "@/app/actions";
import { CATEGORY_LABELS, type TaxonomyCategory } from "@/lib/taxonomy-data";

export function SuggestTagForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="stack-form panel"
      action={async (formData) => {
        setMessage(null);
        setError(null);
        const result = await suggestNewTag(formData);
        if (result.ok) setMessage(result.message);
        else setError(result.message);
      }}
    >
      <h2 className="section-title">Suggest a new tag</h2>
      <p className="hint">
        Not in the list? Suggest it for review — it will not appear on profiles
        until approved.
      </p>
      {message ? <p className="meta">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <label>
        Proposed name
        <input name="label" required minLength={2} maxLength={60} placeholder="Urban sketching" />
      </label>
      <label>
        Category guess
        <select name="category" defaultValue="">
          <option value="">Unsure</option>
          {(Object.keys(CATEGORY_LABELS) as TaxonomyCategory[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Note (optional)
        <input name="note" maxLength={200} placeholder="Why it belongs" />
      </label>
      <button type="submit" className="btn subtle">
        Submit for review
      </button>
    </form>
  );
}
