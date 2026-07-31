import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { CompanySite } from "@/components/site/CompanySite";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://delphi-sandy.vercel.app"),
  title: { absolute: "Delphi | Governed Investment Decision Infrastructure" },
  description:
    "Delphi turns material evidence into cited, human-approved changes to an investment thesis and records what the team decides.",
  openGraph: {
    title: "Delphi | Governed Investment Decision Infrastructure",
    description:
      "A governed decision layer for fundamental investment teams, currently available as a deterministic interactive prototype.",
    type: "website",
    images: [
      {
        url: "/delphi-social-preview.png",
        width: 1200,
        height: 630,
        alt: "Evidence passes through an approval checkpoint into a durable decision ledger.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Delphi | Governed Investment Decision Infrastructure",
    description:
      "A governed decision layer for fundamental investment teams, currently available as a deterministic interactive prototype.",
    images: ["/delphi-social-preview.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#07110f",
};

export default function CompanyWebsitePage() {
  return (
    <div className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <CompanySite />
    </div>
  );
}
