import { onboardProfile } from "@/app/actions";
import { ProfileForm } from "@/components/ProfileForm";
import { getAuthUserId, getSessionProfile } from "@/lib/session";
import { normalizeHandle } from "@/lib/tags";
import { listTaxonomy } from "@/lib/taxonomy";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string; error?: string }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");
  const existing = await getSessionProfile();
  if (existing) redirect(`/u/${existing.handle}`);

  const params = await searchParams;
  const handle = normalizeHandle(params.handle ?? "");
  const taxonomy = await listTaxonomy();

  return (
    <section className="stack">
      <div>
        <h1 className="page-title">Create profile</h1>
        <p className="lede">
          Pick a handle, then choose tags from the curated taxonomy with 1–10
          levels. Rank is the sum of those levels.
        </p>
      </div>
      {params.error === "invalid" ? (
        <p className="error">Handle must be 3–24 letters, numbers, or _.</p>
      ) : null}
      {params.error === "taken" ? (
        <p className="error">That handle is taken. Try another.</p>
      ) : null}
      {params.error === "taxonomy" ? (
        <p className="error">
          Tags must come from the curated list. Use suggest if something is
          missing.
        </p>
      ) : null}
      <ProfileForm
        action={onboardProfile}
        submitLabel="Create profile"
        taxonomy={taxonomy}
        defaultHandle={handle}
      />
    </section>
  );
}
