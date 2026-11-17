import { TagFields } from "@/components/TagPicker";
import type { TaxonomySubtag, TaxonomyTag } from "@/lib/taxonomy-data";

type ProfileFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  taxonomy: TaxonomyTag[];
  subtags?: TaxonomySubtag[];
  defaultHandle?: string;
  defaultBio?: string;
  defaultLookingFor?: string;
  defaultPrimaryTag?: string;
  defaultPrimaryLevel?: number;
  defaultSecondaries?: Array<{ slug: string; level: number }>;
  defaultSubtags?: string[];
  handleLocked?: boolean;
};

export function ProfileForm({
  action,
  submitLabel,
  taxonomy,
  subtags = [],
  defaultHandle = "",
  defaultBio = "",
  defaultLookingFor = "",
  defaultPrimaryTag = "",
  defaultPrimaryLevel = 5,
  defaultSecondaries = [],
  defaultSubtags = [],
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
          subtags={subtags}
          defaultPrimary={defaultPrimaryTag}
          defaultPrimaryLevel={defaultPrimaryLevel}
          defaultSecondaries={defaultSecondaries}
          defaultSubtags={defaultSubtags}
        />

        <button type="submit" className="btn">
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
