"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "./WalletButton";

const links = [["/campaigns", "Campaign"], ["/dashboard", "Dashboard"], ["/audit", "Audit"], ["/faucet", "Faucet"]] as const;

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <header className="nav">
      <Link href="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark">✦</span>TaniTrace</Link>
      <nav className="desktop-nav" aria-label="Navigasi utama">
        {links.map(([href, label]) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}>{label}</Link>)}
      </nav>
      <WalletButton />
      <button className="mobile-toggle" type="button" aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "×" : "☰"}</button>
      {open ? <nav className="mobile-menu" aria-label="Navigasi mobile">{links.map(([href, label]) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}</nav> : null}
    </header>
  );
}
