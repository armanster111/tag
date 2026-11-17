import Link from "next/link";

export function TagChip({
  tag,
  level,
  primary = false,
  endorsements = 0,
  label,
}: {
  tag: string;
  level: number;
  primary?: boolean;
  endorsements?: number;
  label?: string;
}) {
  return (
    <Link
      href={`/t/${encodeURIComponent(tag)}?level=${level}`}
      className={`tag-chip${primary ? " tag-chip-primary" : ""}`}
    >
      <span className="tag-name">{label ?? tag}</span>
      <span className="tag-level">{level}</span>
      {endorsements > 0 ? (
        <span className="tag-endorsements" title="Endorsements">
          ✦{endorsements}
        </span>
      ) : null}
    </Link>
  );
}
