import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalLayout({ title, updated, children }: Props) {
  return (
    <div className="legal-page">
      <article className="legal-doc">
        <p className="eyebrow">Training Scheduler</p>
        <h1>{title}</h1>
        <p className="legal-meta">Last updated: {updated}</p>
        <div className="legal-body">{children}</div>
        <nav className="legal-nav" aria-label="Legal">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/login">Sign in</Link>
        </nav>
      </article>
    </div>
  );
}
