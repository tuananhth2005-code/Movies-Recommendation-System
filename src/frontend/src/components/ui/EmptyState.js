import React from 'react';

function EmptyIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-[var(--primary)]" aria-hidden="true">
        <path d="M4.75 7.75A2.75 2.75 0 0 1 7.5 5h9A2.75 2.75 0 0 1 19.25 7.75v8.5A2.75 2.75 0 0 1 16.5 19h-9a2.75 2.75 0 0 1-2.75-2.75z" stroke="currentColor" strokeWidth="1.5" />
        <path d="m8 14 2.2-2.2a1 1 0 0 1 1.4 0L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="9" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function EmptyState({ title, description, action, compact = false }) {
  return (
    <div className={`flex w-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(159,255,136,0.08),rgba(0,210,253,0.06))] px-6 text-center ${compact ? 'py-10' : 'py-14 sm:px-8 sm:py-16'}`}>
      <EmptyIcon />
      <h3 className="mt-5 font-display text-xl font-bold text-[var(--on-surface)] sm:text-2xl">{title}</h3>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--on-surface-variant)] sm:text-base">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
