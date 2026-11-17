import Link from "next/link";
import { logout } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function SiteHeader({ me }: { me: Profile | null }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        Tag
      </Link>
      <nav className="site-nav">
        <Link href="/tags">Tags</Link>
        <Link href="/looking">Looking</Link>
        <Link href="/leaderboards">Boards</Link>
        <Link href="/spotlights">Spotlights</Link>
        {me ? (
          <>
            <Link href="/messages">DMs</Link>
            <Link href="/friends">Friends</Link>
            <Link href={`/u/${me.handle}`}>@{me.handle}</Link>
            <Link href={`/u/${me.handle}/edit`}>Edit</Link>
            <Link href="/settings/safety">Safety</Link>
            <form action={logout}>
              <button type="submit" className="linkish">
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/onboarding" className="btn">
              Join
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
