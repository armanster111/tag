import Link from "next/link";
import type { FeedSort } from "@/lib/types";

export function FeedTabs({ sort }: { sort: FeedSort }) {
  return (
    <div className="feed-tabs">
      <Link
        href="/?sort=newest"
        className={sort === "newest" ? "tab active" : "tab"}
      >
        Newest
      </Link>
      <Link
        href="/?sort=active"
        className={sort === "active" ? "tab active" : "tab"}
      >
        Most active
      </Link>
      <Link
        href="/?sort=rising"
        className={sort === "rising" ? "tab active" : "tab"}
      >
        Rising
      </Link>
    </div>
  );
}
