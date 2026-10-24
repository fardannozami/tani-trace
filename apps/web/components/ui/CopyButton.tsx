"use client";
import { useState } from "react";
import { buttonStyles } from "./styles";
export interface CopyButtonProps { text: string; label?: string; }
export function CopyButton({ text, label = "Salin tautan" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }
  return (
    <>
      <style href="tt-buttons" precedence="tt-ui">{buttonStyles}</style>
      <button type="button" className="tt-button tt-button-primary" onClick={copy} aria-label={copied ? "Tautan tersalin" : label} aria-live="polite">{copied ? "Tersalin" : label}</button>
    </>
  );
}
