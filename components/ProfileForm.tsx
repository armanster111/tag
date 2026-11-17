import { TagFields } from "@/components/TagPicker";
import { SuggestTagForm } from "@/components/SuggestTagForm";
import type { TaxonomyTag } from "@/lib/taxonomy-data";

type ProfileFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  taxonomy: TaxonomyTag[];
  defaultHandle?: string;
  defaultBio?: string;
  defaultLookingFor?: string;
  defaultPrimaryTag?: string;
  defaultPrimaryLevel?: number;
  defaultSecondaries?: Array<{ slug: string; level: number }>;
  handleLocked?: boolean;
};

export function ProfileForm({
  action,
  submitLabel,
  taxonomy,
  defaultHandle = "",
  defaultBio = "",
  defaultLookingFor = "",
  defaultPrimaryTag = "",
  defaultPrimaryLevel = 5,
  defaultSecondaries = [],
  handleLocked = false,
}: ProfileFormProps) {
  return (
    <div className="stack">
      <form action={action} className="stack-form panel">
        <label>
          Handle
          <input
            name="handle"
            defaultValue={defaultHandle}
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_]+"
            readOnly={handleLocked}
            placeholder="yourname"
          />
        </label>
        <label>
          Bio line
          <input
            name="bio"
            defaultValue={defaultBio}
            maxLength={140}
            placeholder="One short line about you"
          />
        </label>
        <label>
          Looking for
          <input
            name="looking_for"
            defaultValue={defaultLookingFor}
            maxLength={140}
            placeholder="chess partner, photo buddy…"
          />
        </label>

        <TagFields
          taxonomy={taxonomy}
          defaultPrimary={defaultPrimaryTag}
          defaultPrimaryLevel={defaultPrimaryLevel}
          defaultSecondaries={defaultSecondaries}
        />

        <button type="submit" className="btn">
          {submitLabel}
        </button>
      </form>

      <SuggestTagForm />
    </div>
  );
}
