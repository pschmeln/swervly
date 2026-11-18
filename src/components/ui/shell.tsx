import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`glass rounded-[22px] p-5 sm:p-6 ${className}`}>{children}</section>;
}

const WIDTHS = {
  default: "max-w-3xl",
  wide: "max-w-5xl",
} as const;

/**
 * Page frame: the title sits in white serif on the blue sky band, and the
 * page content starts where the band fades to white. Content overlaps only the
 * last 32px of the fade (about #dcebfd to white), so dark text there stays readable.
 */
export function PageShell({
  title,
  description,
  width = "default",
  children,
}: {
  title?: string;
  /** One short line under the title, in white on the band. */
  description?: string;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  const max = WIDTHS[width];
  return (
    <main className="flex w-full flex-1 flex-col">
      <div className="sky-band">
        <div className={`mx-auto w-full ${max} px-4 ${title ? "pb-28 pt-8 sm:pt-10" : "pb-16 pt-2"}`}>
          {title ? (
            <h1 className="font-serif text-[2.5rem] font-normal leading-none tracking-[-0.01em] text-white sm:text-5xl">
              {title}
            </h1>
          ) : null}
          {description ? <p className="mt-3 max-w-xl text-lg leading-relaxed text-white">{description}</p> : null}
        </div>
      </div>
      <div className={`relative mx-auto -mt-8 flex w-full ${max} flex-1 flex-col gap-4 px-4 pb-10`}>{children}</div>
    </main>
  );
}
