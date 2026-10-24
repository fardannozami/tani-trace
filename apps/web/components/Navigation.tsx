import Link from "next/link";
import { WalletButton } from "./WalletButton";
export function Navigation() { return <header className="nav"><Link href="/" className="brand"><span className="brand-mark">✦</span>TaniTrace</Link><nav><Link href="/campaigns">Campaign</Link><Link href="/dashboard">Dashboard</Link><Link href="/audit">Audit</Link><Link href="/faucet">Faucet</Link></nav><WalletButton /></header>; }
