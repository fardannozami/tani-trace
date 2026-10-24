"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
export function WalletButton() { const { address, isConnected } = useAccount(); const { connect, connectors } = useConnect(); const { disconnect } = useDisconnect(); if (isConnected) return <button className="button secondary" onClick={() => disconnect()}>{address?.slice(0, 6)}…{address?.slice(-4)} · Keluar</button>; return <button className="button" onClick={() => connect({ connector: connectors[0] })}>Hubungkan wallet</button>; }
