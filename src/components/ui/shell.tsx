import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function PageShell({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      {title ? <h1 className="text-2xl font-semibold tracking-tight">{title}</h1> : null}
      {children}
    </main>
  );
}
