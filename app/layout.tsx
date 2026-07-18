import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Delphi | Investment Decision OS Demo",
    template: "%s · Delphi",
  },
  description:
    "Delphi turns material market events into cited, human-reviewed changes in an approved investment view. Real public source facts and demo-authored thesis context are labeled separately.",
  icons: {
    icon: [{ url: "/delphi-mark.svg", type: "image/svg+xml" }],
    shortcut: "/delphi-mark.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
