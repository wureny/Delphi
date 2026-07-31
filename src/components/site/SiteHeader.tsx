"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import styles from "./company-site.module.css";

const NAV_ITEMS = [
  { href: "#thesis", label: "Thesis" },
  { href: "#prototype", label: "Prototype" },
  { href: "#system", label: "System" },
  { href: "#stage", label: "Stage" },
  { href: "#contact", label: "Contact Delphi" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.siteHeader}>
      <nav className={styles.siteNav} aria-label="Company website">
        <Link href="/" className={styles.brand} aria-label="Delphi home">
          <Image src="/delphi-mark.svg" alt="" width={28} height={28} priority unoptimized />
          <span>Delphi</span>
        </Link>

        <div className={styles.desktopNav}>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className={styles.navActions}>
          <Link href="/demo" className={styles.navDemoLink}>
            Open demo
          </Link>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="site-mobile-nav"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </nav>

      <nav id="site-mobile-nav" className={styles.mobileNav} data-open={open ? "true" : "false"} aria-label="Mobile">
        {NAV_ITEMS.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
