"use client";

import { useState } from "react";
import Link from "next/link";
import { REFLECT_LINE, type DiscussionLink } from "@/features/atlas/context-links";
import { ROUTES } from "@/lib/constants";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { COMPANY_NOTE } from "@/content/atlas/company-links";
import { ANSWER_LABELS, type PreferenceQuestion, type QuestionAnswer } from "@/content/atlas/questions";
import type { Ranked } from "@/features/atlas/rank";
import type { AtlasNodeId } from "@/features/atlas/types";
import {
  NO_SKILLS_NOTE,
  NO_SOFTWARE_NOTE,
  RELATED_NOTE,
  SKILLS_NOTE,
  SOFTWARE_NOTE,
  TASKS_NOTE,
  type CardModel,
  type CompanyModel,
  type NodeModel,
} from "@/features/atlas/view";

/** Pieces of the career map screen. State and saving live in AtlasExplorer. */

export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

const linkButton = `min-h-12 self-start rounded px-1 text-sm text-sky-800 underline ${focusRing}`;

/** Organizations shown per area before "Show all". */
const COMPANIES_SHOWN = 8;

type Details = NonNullable<NodeModel["details"]>;

export function Badge({ children }: { children: string }) {
  return <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">{children}</span>;
}

export function NodeCard({ item, onOpen }: { item: CardModel; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-h-12 w-full flex-col items-start gap-1 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:bg-neutral-50 ${focusRing}`}
      >
        <span className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-neutral-900">{item.title}</span>
          <Badge>{item.badge}</Badge>
        </span>
        {item.summary ? <span className="text-sm text-neutral-700">{item.summary}</span> : null}
        {item.why ? <span className="text-sm text-neutral-600">{item.why}</span> : null}
        {item.interested ? <span className="text-sm font-medium text-sky-800">Interested</span> : null}
      </button>
    </li>
  );
}

function PickCard({ item, onOpen }: { item: Ranked; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-h-12 w-full flex-col items-start gap-1 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:bg-neutral-50 ${focusRing}`}
      >
        <span className="font-medium text-neutral-900">{item.title}</span>
        <ul className="list-disc pl-5 text-sm text-neutral-600">
          {item.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </button>
    </li>
  );
}

export function Breadcrumbs({ crumbs, onGo }: { crumbs: { label: string; depth: number }[]; onGo: (depth: number) => void }) {
  return (
    <nav aria-label="Where you are in the career map">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.depth}-${crumb.label}`} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-medium text-neutral-900">{crumb.label}</span>
              ) : (
                <button type="button" onClick={() => onGo(crumb.depth)} className={`rounded px-1 py-2 text-sky-800 underline ${focusRing}`}>
                  {crumb.label}
                </button>
              )}
              {last ? null : <span aria-hidden="true" className="text-neutral-400">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---- Start screen --------------------------------------------------------------------------

export function SearchCard({
  heading,
  note,
  query,
  results,
  onQuery,
  onOpen,
}: {
  heading: string;
  note: string;
  query: string;
  results: { id: AtlasNodeId; title: string; level: string }[];
  onQuery: (query: string) => void;
  onOpen: (id: AtlasNodeId) => void;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-neutral-600">{note}</p>
      <div className="mt-4">
        <Field label="Search careers" htmlFor="atlas-search" hint="Search any area, family, specialization or occupation.">
          <TextInput id="atlas-search" value={query} onChange={(event) => onQuery(event.target.value)} autoComplete="off" />
        </Field>
      </div>
      {query.trim().length >= 2 ? (
        results.length > 0 ? (
          <ul className="mt-3 grid gap-2" aria-label="Search results">
            {results.map((result) => (
              <li key={result.id}>
                <button type="button" onClick={() => { onQuery(""); onOpen(result.id); }} className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-left hover:bg-neutral-50 ${focusRing}`}>
                  <span className="text-neutral-900">{result.title}</span>
                  <span className="text-xs text-neutral-600">{result.level}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">Nothing in the map matches that yet.</p>
        )
      ) : null}
    </Card>
  );
}

export function PursuingCard({ title, onOpen, onStop }: { title: string | undefined; onOpen: () => void; onStop: () => void }) {
  return (
    <Card>
      <p className="text-sm text-neutral-600">Your direction</p>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600">You chose this. You can change it any time; nothing else is hidden because of it.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onOpen} className="w-full sm:w-auto">Open</Button>
        <Button variant="secondary" onClick={onStop} className="w-full sm:w-auto">Stop pursuing this</Button>
      </div>
    </Card>
  );
}

export function QuestionCard({
  question,
  note,
  onAnswer,
  onSkip,
}: {
  question: PreferenceQuestion;
  note: string;
  onAnswer: (value: QuestionAnswer) => void;
  onSkip: () => void;
}) {
  const options = [
    ["a", question.a.label],
    ["b", question.b.label],
    ["both", ANSWER_LABELS.both],
    ["unsure", ANSWER_LABELS.unsure],
  ] as const;
  return (
    <Card>
      <fieldset>
        <legend className="text-lg font-semibold">{question.prompt}</legend>
        <p className="mt-1 text-sm text-neutral-600">{note}</p>
        <div className="mt-3 grid gap-2">
          {options.map(([value, label]) => (
            <Button key={value} variant="secondary" onClick={() => onAnswer(value)} className="w-full justify-start text-left">
              {label}
            </Button>
          ))}
          <button type="button" onClick={onSkip} className={linkButton}>
            Skip this question
          </button>
        </div>
      </fieldset>
    </Card>
  );
}

export function PicksSection({
  picks,
  canClear,
  onOpen,
  onClear,
}: {
  picks: readonly Ranked[];
  canClear: boolean;
  onOpen: (id: AtlasNodeId) => void;
  onClear: () => void;
}) {
  return (
    <section aria-label="Start here" className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Start here</h2>
      <p className="text-sm text-neutral-600">Ordered by what you told Swervly on this screen.</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {picks.slice(0, 3).map((item) => <PickCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />)}
      </ul>
      {picks.length > 3 ? (
        <>
          <h2 className="mt-2 text-lg font-semibold">Also worth a look</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {picks.slice(3).map((item) => <PickCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />)}
          </ul>
        </>
      ) : null}
      {canClear ? (
        <button type="button" onClick={onClear} className={linkButton}>
          Clear my answers
        </button>
      ) : null}
    </section>
  );
}

export function CardGroup({ title, cards, onOpen }: { title: string; cards: readonly CardModel[]; onOpen: (id: AtlasNodeId) => void }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {cards.map((item) => (
          <NodeCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />
        ))}
      </ul>
    </section>
  );
}

// ---- One career ------------------------------------------------------------------------------

function ChipList({ heading, items, note, emptyNote }: { heading: string; items: readonly string[]; note: string; emptyNote: string }) {
  return (
    <>
      <h2 className="mt-5 text-lg font-semibold">{heading}</h2>
      {items.length > 0 ? (
        <>
          <p className="mt-1 text-sm text-neutral-600">{note}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {items.map((name) => (
              <li key={name} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-800">{name}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-neutral-600">{emptyNote}</p>
      )}
    </>
  );
}

/** O*NET tasks, skills, software and preparation for an occupation. */
export function OccupationDetails({ details }: { details: Details }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Typical tasks</h2>
      <p className="mt-1 text-sm text-neutral-600">{TASKS_NOTE}</p>
      <ul className="mt-2 list-disc pl-5 text-neutral-800">
        {details.tasks.map((task) => <li key={task} className="mt-1">{task}</li>)}
      </ul>
      <ChipList heading="Skills that stand out" items={details.skills} note={SKILLS_NOTE} emptyNote={NO_SKILLS_NOTE} />
      <ChipList heading="Software in demand" items={details.software} note={SOFTWARE_NOTE} emptyNote={NO_SOFTWARE_NOTE} />
      {details.jobZone ? (
        <>
          <h2 className="mt-5 text-lg font-semibold">Preparation usually needed</h2>
          <p className="mt-1 font-medium text-neutral-900">{details.jobZone.name}</p>
          <p className="mt-1 text-neutral-800">{details.jobZone.education}</p>
        </>
      ) : null}
    </Card>
  );
}

export function RelatedOccupations({ related, onOpen }: { related: Details["related"]; onOpen: (id: AtlasNodeId) => void }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Related occupations</h2>
      <p className="mt-1 text-sm text-neutral-600">{RELATED_NOTE}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {related.map((item) => (
          <li key={item.title}>
            {item.id ? (
              <button type="button" onClick={() => item.id && onOpen(item.id)} className={`min-h-12 rounded-full border border-neutral-200 bg-white px-4 text-left text-sm text-sky-800 underline hover:bg-neutral-50 ${focusRing}`}>
                {item.title}
              </button>
            ) : item.href ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-12 items-center rounded-full bg-neutral-100 px-4 text-sm text-neutral-800 underline ${focusRing}`}>
                {item.title}
                <span className="sr-only"> (O*NET OnLine, opens in a new tab)</span>
              </a>
            ) : (
              <span className="inline-flex min-h-12 items-center rounded-full bg-neutral-100 px-4 text-sm text-neutral-800">{item.title}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The careers one level down. Remount it (key) to fold "hidden by your choices" back up. */
export function ChildrenSection({
  heading,
  shown,
  hidden,
  onOpen,
}: {
  heading: string;
  shown: readonly CardModel[];
  hidden: readonly CardModel[];
  onOpen: (id: AtlasNodeId) => void;
}) {
  const [showHidden, setShowHidden] = useState(false);
  return (
    <section aria-label={heading} className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {shown.length === 0 ? <p className="text-sm text-neutral-600">Everything here is hidden by your choices.</p> : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((item) => (
          <NodeCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />
        ))}
      </ul>
      {hidden.length > 0 ? (
        <div>
          <Button variant="secondary" aria-expanded={showHidden} onClick={() => setShowHidden((value) => !value)} className="w-full sm:w-auto">
            {showHidden ? "Hide" : "Show"} {hidden.length} hidden by your choices
          </Button>
          {showHidden ? (
            <ul className="mt-2 grid gap-2 opacity-70 sm:grid-cols-2">
              {hidden.map((item) => (
                <NodeCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Organizations listed under this area. Remount it (key) to fold the full list back up. */
export const COMPANY_PAGE_LABEL = "Co-op reviews on Swervly";

export function OrganizationsCard({
  companies,
}: {
  companies: readonly (CompanyModel & { nearby?: string | null; reviewsHref?: string | null })[];
}) {
  const [showAll, setShowAll] = useState(false);
  return (
    <Card>
      <h2 className="text-lg font-semibold">Organizations in this area</h2>
      <p className="mt-1 text-sm text-neutral-600">{COMPANY_NOTE}</p>
      <ul className="mt-3 grid gap-2">
        {(showAll ? companies : companies.slice(0, COMPANIES_SHOWN)).map((company) => (
          <li key={company.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="font-medium text-neutral-900">{company.name}</p>
            <p className="text-sm text-neutral-600">{company.field} · Listed under {company.areas.join(" and ")}</p>
            {company.nearby ? <p className="mt-1 text-sm font-medium text-emerald-800">{company.nearby}</p> : null}
            {company.reviewsHref ? (
              <p className="mt-1 text-sm">
                <Link href={company.reviewsHref} className={`inline-flex min-h-12 items-center font-medium text-sky-800 underline ${focusRing}`}>
                  {COMPANY_PAGE_LABEL}
                </Link>
              </p>
            ) : null}
            {company.careersUrl ? (
              <p className="mt-1 text-sm">
                <a href={company.careersUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-800 underline">
                  Official careers page
                </a>{" "}
                <span className="text-neutral-600">(External)</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {companies.length > COMPANIES_SHOWN ? (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
          className={`mt-2 min-h-12 rounded px-1 text-sm text-sky-800 underline ${focusRing}`}
        >
          {showAll ? "Show fewer" : `Show all ${companies.length} organizations`}
        </button>
      ) : null}
    </Card>
  );
}

export function AlsoUnder({ items, onGo }: { items: NodeModel["alsoUnder"]; onGo: (path: AtlasNodeId[]) => void }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Also found under</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.label}>
            <button type="button" onClick={() => onGo(item.path)} className={`min-h-12 rounded-full border border-neutral-200 bg-white px-4 text-sm text-neutral-900 hover:bg-neutral-50 ${focusRing}`}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function WhyShown({ why, unknowns }: { why: readonly string[]; unknowns: readonly string[] }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Why this is shown</h2>
      <ul className="mt-2 list-disc pl-5 text-neutral-700">
        {why.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <h2 className="mt-4 text-lg font-semibold">What Swervly doesn&apos;t know yet</h2>
      <ul className="mt-2 list-disc pl-5 text-neutral-700">
        {unknowns.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </Card>
  );
}

/** Where to go next for a career: student discussions about it, and an optional co-op reflection. */
export function FromStudentsCard({ discussions }: { discussions: readonly DiscussionLink[] }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">From students</h2>
      {discussions.length > 0 ? (
        <ul className="mt-2 grid gap-1">
          {discussions.map((item) => (
            <li key={item.role}>
              <Link href={item.href} className={`inline-flex min-h-12 items-center font-medium text-sky-800 underline ${focusRing}`}>
                Questions and advice about {item.label} in Community
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-sm text-neutral-700">
        {REFLECT_LINE}{" "}
        <Link href={ROUTES.reviewsNew} className={`inline-flex min-h-12 items-center font-medium text-sky-800 underline ${focusRing}`}>
          Reflect on a co-op
        </Link>
      </p>
    </Card>
  );
}
