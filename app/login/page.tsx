import { loginWithEmail } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <section className="panel">
      <h1 className="page-title">Log in</h1>
      <p className="lede">
        Magic link via email — we&apos;ll send a one-time sign-in link.
      </p>
      {params.sent ? (
        <p className="meta">Check your email for the sign-in link.</p>
      ) : null}
      {params.error === "invalid" ? (
        <p className="error">Enter a valid email.</p>
      ) : null}
      {params.error === "send" ? (
        <p className="error">Could not send the link. Try again.</p>
      ) : null}
      {params.error === "auth" ? (
        <p className="error">Auth failed. Request a new link.</p>
      ) : null}
      <form action={loginWithEmail} className="stack-form">
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" className="btn">
          Email me a link
        </button>
      </form>
      <p className="meta" style={{ marginTop: "1rem" }}>
        After login, new accounts go to{" "}
        <Link href="/onboarding">onboarding</Link> to pick a handle and tags.
      </p>
    </section>
  );
}
