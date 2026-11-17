import Link from "next/link";
import type { TagCloudItem } from "@/lib/types";

export function TagCloud({ items }: { items: TagCloudItem[] }) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.count));

  return (
    <section className="panel tag-cloud">
      <h2 className="section-title">Tag cloud</h2>
      <div className="cloud-row">
        {items.map((item) => {
          const weight = 0.85 + (item.count / max) * 0.9;
          return (
            <Link
              key={item.tag}
              href={`/t/${encodeURIComponent(item.tag)}`}
              className="cloud-tag"
              style={{ fontSize: `${weight}rem` }}
              title={item.category ?? undefined}
            >
              {item.label ?? item.tag}
              <span className="cloud-count">{item.count}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
