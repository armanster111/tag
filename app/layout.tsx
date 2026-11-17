import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { getSessionProfile } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tag",
  description: "Profiles connected by shared interest tags and skill levels.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const me = await getSessionProfile();

  return (
    <html lang="en">
      <body>
        <SiteHeader me={me} />
        <main>{children}</main>
      </body>
    </html>
  );
}
