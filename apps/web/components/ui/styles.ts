/** Shared presentational styles for TaniTrace UI components.
 *  Hoisted React 19 <style> blocks, deduped by href. Uses design tokens from globals.css. */
export const buttonStyles = `
.tt-button{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:12px;padding:11px 16px;font:700 14px 'DM Sans',sans-serif;cursor:pointer;transition:transform .15s ease,filter .15s ease;}
.tt-button:hover{filter:brightness(1.06);transform:translateY(-1px);}
.tt-button:focus-visible{outline:2px solid var(--green);outline-offset:2px;}
.tt-button:active{transform:translateY(0);}
.tt-button:disabled{opacity:.55;cursor:not-allowed;transform:none;}
.tt-button-primary{background:var(--green);color:#fff;}
.tt-button-secondary{background:var(--mint);color:var(--green);}
.tt-button-ghost{background:transparent;color:var(--green);border:1px solid var(--line);}
`;

export const cardStyles = `
.tt-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-card);box-shadow:var(--shadow-card);}
`;
