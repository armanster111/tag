import { saveProfile } from "@/app/actions";
import { ProfileForm } from "@/components/ProfileForm";
import { getProfileWithTagsByHandle } from "@/lib/profiles";
import { getSessionProfileId } from "@/lib/session";
import { listTaxonomy } from "@/lib/taxonomy";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { handle } = await params;
  const query = await searchParams;
  const profile = await getProfileWithTagsByHandle(handle);
  if (!profile) redirect("/");

  const sessionId = await getSessionProfileId();
  if (!sessionId || sessionId !== profile.id) redirect("/login");

  const primary = profile.primary_tag;
  const secondaries = profile.tags
    .filter((t) => !t.is_primary)
    .map((t) => ({ slug: t.tag, level: t.level }));
  const taxonomy = await listTaxonomy();

  return (
    <section className="stack">
      <div>
        <h1 className="page-title">Edit @{profile.handle}</h1>
        <p className="lede">
          Tags must be chosen from the taxonomy. Suggest anything missing for
          review.
        </p>
      </div>
      {query.error === "taxonomy" ? (
        <p className="error">Pick tags from the curated list only.</p>
      ) : null}
      <ProfileForm
        action={saveProfile}
        submitLabel="Save profile"
        taxonomy={taxonomy}
        defaultHandle={profile.handle}
        defaultBio={profile.bio}
        defaultLookingFor={profile.looking_for}
        defaultPrimaryTag={primary?.tag ?? ""}
        defaultPrimaryLevel={primary?.level ?? 5}
        defaultSecondaries={secondaries}
        handleLocked
      />
    </section>
  );
}
