"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "./WalletButton";
import { usePendingVotes } from "../hooks/usePendingVotes";

const links = [["/campaigns", "Campaign"], ["/voting", "Voting"], ["/dashboard", "Dashboard"], ["/audit", "Audit"], ["/faucet", "Faucet"]] as const;

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { votes } = usePendingVotes();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const renderLink = ([href, label]: (typeof links)[number]) => (
    <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} onClick={() => setOpen(false)}>
      {label}{href === "/voting" && votes.length > 0 ? <span aria-label={`${votes.length} pengajuan menunggu voting`} style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "2px 7px", background: "var(--amber-soft)", color: "var(--amber)" }}>{votes.length}</span> : null}
    </Link>
  );
  return (
    <header className="nav">
      <Link href="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark">✦</span><span>Tani<span className="brand-accent">Trace</span></span></Link>
      <nav className="desktop-nav" aria-label="Navigasi utama">
        {links.map(renderLink)}
      </nav>
      <span className="network-pill"><span className="network-dot" /> Monad Testnet</span>
      <WalletButton />
      <button className="mobile-toggle" type="button" aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "×" : "☰"}</button>
      {open ? <nav className="mobile-menu" aria-label="Navigasi mobile">{links.map(renderLink)}</nav> : null}
    </header>
  );
}
