import type { ReactNode } from "react";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  icon?: ReactNode;
}

const ICON = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>`;

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <>
      <style href="tt-empty-state" precedence="tt-ui">{`
        .tt-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:56px 28px;background:var(--card);border:1px dashed var(--line);border-radius:var(--radius-card);}
        .tt-empty-icon{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:var(--mint);color:var(--green);margin-bottom:10px;}
        .tt-empty h3{margin:0;font:700 20px 'Space Grotesk',sans-serif;color:var(--ink);letter-spacing:-.02em;}
        .tt-empty p{margin:0;max-width:380px;font-size:14.5px;line-height:1.65;color:var(--muted);}
        .tt-empty .tt-button{margin-top:16px;}
        @media (prefers-reduced-motion: no-preference){
          .tt-empty-icon{transition:transform .25s ease;}
          .tt-empty:hover .tt-empty-icon{transform:translateY(-3px) rotate(-4deg);}
        }
      `}</style>
      <div className="tt-empty">
        <span className="tt-empty-icon" aria-hidden="true">
          {icon ?? <span dangerouslySetInnerHTML={{ __html: ICON }} />}
        </span>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        {action ? (
          action.href ? (
            <a className="tt-button tt-button-primary" href={action.href}>
              {action.label}
            </a>
          ) : (
            <button type="button" className="tt-button tt-button-primary" onClick={action.onClick}>
              {action.label}
            </button>
          )
        ) : null}
      </div>
    </>
  );
}
