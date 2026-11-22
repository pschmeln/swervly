"use client";

import { useMemo, useReducer, useState } from "react";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { ONET_CREDIT } from "@/content/atlas/occupations";
import { COMPANY_NOTE } from "@/content/atlas/company-links";
import { ANSWER_LABELS, type QuestionAnswer } from "@/content/atlas/questions";
import { hasSignals, nextQuestion, questionPool, rankSpecializations, topPicks, type Answers, type Ranked } from "@/features/atlas/rank";
import type { AtlasEntry } from "@/features/atlas/entry";
import { comparePanel, compareFrom, compareReducer } from "@/features/atlas/compare";
import { ComparePanel, COMPARE_PANEL_ID } from "@/features/atlas/components/compare-panel";
import { atlasGraph } from "@/features/atlas/graph";
import { ROUTES } from "@/lib/constants";
import type { AtlasNodeId } from "@/features/atlas/types";
import {
  ATLAS_BANNER,
  CLOSEST_LABEL,
  companiesFor,
  defaultTrail,
  MARK_NOTE,
  NO_SKILLS_NOTE,
  NO_SOFTWARE_NOTE,
  nodeModel,
  onetOnlineHref,
  rootModel,
  searchAtlas,
  RELATED_NOTE,
  SKILLS_NOTE,
  SOFTWARE_NOTE,
  TASKS_NOTE,
  type CardModel,
  type Marks,
} from "@/features/atlas/view";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

/** Organizations shown per area before "Show all". */
const COMPANIES_SHOWN = 8;

function Badge({ children }: { children: string }) {
  return <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">{children}</span>;
}

function NodeCard({ item, onOpen }: { item: CardModel; onOpen: () => void }) {
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

export const ANSWERS_NOTE = "Your answers stay on this screen. They are not saved, and they only reorder what you see first.";
export const ANSWERS_SAVED_NOTE = "Your answers are saved to your account. They only reorder what you see first, and you can clear them any time.";
export const SAVED_NOTE = "Saved.";
export const SAVE_FAILED_NOTE = "Couldn't save that. It stays on this screen for now.";

export type InitialSaved = {
  available: boolean;
  interested: AtlasNodeId[];
  dismissed: AtlasNodeId[];
  pursuing: AtlasNodeId | null;
  answers: Answers;
};

async function send(url: string, method: "PUT" | "DELETE", body?: unknown): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function AtlasExplorer({
  entry,
  dismissedRoles,
  interestedRoles = [],
  directionSuggested = [],
  evidence = [],
  initialFocus,
  initialAnswers = {},
  initialCompare = [],
  saved,
}: {
  entry: AtlasEntry;
  /** Direction role ids the student dismissed. Read only. */
  dismissedRoles: readonly string[];
  /** Direction role ids the student marked Interested. Read only. */
  interestedRoles?: readonly string[];
  /** Roles Direction currently suggests. Read only. */
  directionSuggested?: readonly string[];
  /** Direction's consented student evidence (n >= 2), reused as-is. */
  evidence?: readonly { role: string; roleLabel: string; sampleSize: number }[];
  initialFocus: AtlasNodeId | null;
  /** For tests and previews only. */
  initialAnswers?: Answers;
  initialCompare?: AtlasNodeId[];
  /** Choices saved to the account. When absent or unavailable, nothing is saved. */
  saved?: InitialSaved;
}) {
  const persist = saved?.available === true;
  const graph = atlasGraph();
  const [trail, setTrail] = useState<AtlasNodeId[]>(() => (initialFocus ? defaultTrail(graph, initialFocus) : []));
  const [marks, setMarks] = useState<Marks>({ interested: saved?.interested ?? [], dismissed: saved?.dismissed ?? [] });
  const [pursuing, setPursuing] = useState<AtlasNodeId | null>(saved?.pursuing ?? null);
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>(saved?.available ? saved.answers : initialAnswers);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [compare, dispatchCompare] = useReducer(compareReducer, initialCompare, compareFrom);
  const answeredAny = Object.values(answers).some((value) => value !== "unsure");

  const current = trail.at(-1) ?? null;
  const root = useMemo(() => rootModel(graph, entry, marks, dismissedRoles), [graph, entry, marks, dismissedRoles]);
  const view = useMemo(
    () => (current ? nodeModel(graph, entry, current, trail, marks, dismissedRoles, answeredAny) : null),
    [graph, entry, current, trail, marks, dismissedRoles, answeredAny],
  );
  const results = useMemo(() => searchAtlas(graph, query), [graph, query]);
  const signals = useMemo(
    () => ({
      answers,
      interested: marks.interested,
      dismissed: marks.dismissed,
      directionInterested: interestedRoles,
      directionDismissed: dismissedRoles,
      directionSuggested,
      evidence,
    }),
    [answers, marks, interestedRoles, dismissedRoles, directionSuggested, evidence],
  );
  const ranked = useMemo(() => rankSpecializations(graph, entry, signals), [graph, entry, signals]);
  const picks = useMemo(() => topPicks(ranked, entry), [ranked, entry]);
  const question = useMemo(
    () => nextQuestion(graph, questionPool(ranked, picks, signals), answers, skipped),
    [graph, ranked, picks, signals, answers, skipped],
  );
  const showPicks = hasSignals(signals) && picks.length > 0;

  // The chosen direction is the fixed third column: it depends on `pursuing` only.
  const comparison = useMemo(() => comparePanel(graph, compare, pursuing), [graph, compare, pursuing]);
  const companies = useMemo(() => (current ? companiesFor(graph, current) : []), [graph, current]);

  function pickForCompare(id: AtlasNodeId) {
    dispatchCompare({ type: "pick", id });
    // The panel opens right under the button. Bring it on screen without moving focus.
    requestAnimationFrame(() => {
      document.getElementById(COMPARE_PANEL_ID)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  const comparePanelElement = compare.open ? (
    <ComparePanel
      model={comparison}
      onPick={pickForCompare}
      onClear={(side) => dispatchCompare({ type: "clear", side })}
      onClose={() => dispatchCompare({ type: "close" })}
    />
  ) : null;

  function answer(id: string, value: QuestionAnswer) {
    setAnswers((previous) => ({ ...previous, [id]: value }));
    if (persist) void send(ROUTES.atlasAnswers, "PUT", { questionId: id, answer: value }).then((ok) => { if (!ok) setNotice(SAVE_FAILED_NOTE); });
  }

  function clearAll() {
    setAnswers({});
    setSkipped([]);
    if (persist) void send(ROUTES.atlasAnswers, "DELETE").then((ok) => { if (!ok) setNotice(SAVE_FAILED_NOTE); });
  }

  function go(next: AtlasNodeId[]) {
    setTrail(next);
    setShowHidden(false);
    setShowAllCompanies(false);
    setNotice(null);
  }

  function openChild(id: AtlasNodeId) {
    go([...trail, id]);
  }

  function openFromRoot(id: AtlasNodeId) {
    go(defaultTrail(graph, id));
  }

  async function saveOrNote(ok: Promise<boolean> | null) {
    if (!ok) {
      setNotice(MARK_NOTE);
      return;
    }
    setNotice((await ok) ? SAVED_NOTE : SAVE_FAILED_NOTE);
  }

  function mark(kind: "interested" | "dismissed", id: AtlasNodeId) {
    const on = marks[kind].includes(id);
    const other = kind === "interested" ? "dismissed" : "interested";
    setMarks({
      ...marks,
      [kind]: on ? marks[kind].filter((item) => item !== id) : [...marks[kind], id],
      [other]: on ? marks[other] : marks[other].filter((item) => item !== id),
    });
    if (pursuing === id) setPursuing(null);
    void saveOrNote(persist ? send(ROUTES.atlasMarks, "PUT", { nodeId: id, mark: on ? null : kind }) : null);
  }

  function choose(id: AtlasNodeId) {
    const clearing = pursuing === id;
    setPursuing(clearing ? null : id);
    setMarks({
      interested: marks.interested.includes(id) ? marks.interested : [...marks.interested, id],
      dismissed: marks.dismissed.filter((item) => item !== id),
    });
    // Clearing a direction keeps the career as Interested.
    void saveOrNote(persist ? send(ROUTES.atlasMarks, "PUT", { nodeId: id, mark: clearing ? "interested" : "pursuing" }) : null);
  }

  const crumbs = [{ id: null as AtlasNodeId | null, label: "Start", depth: 0 }].concat(
    trail.map((id, index) => ({ id, label: graph.nodes.get(id)?.title ?? id, depth: index + 1 })),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">{ATLAS_BANNER}</p>

      <nav aria-label="Where you are in the career map">
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={`${crumb.depth}-${crumb.label}`} className="flex items-center gap-1">
                {last ? (
                  <span aria-current="page" className="font-medium text-neutral-900">{crumb.label}</span>
                ) : (
                  <button type="button" onClick={() => go(trail.slice(0, crumb.depth))} className={`rounded px-1 py-2 text-sky-800 underline ${focusRing}`}>
                    {crumb.label}
                  </button>
                )}
                {last ? null : <span aria-hidden="true" className="text-neutral-400">›</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      {view === null ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold">{root.heading}</h2>
            <p className="mt-1 text-sm text-neutral-600">{root.note}</p>
            <div className="mt-4">
              <Field label="Search careers" htmlFor="atlas-search" hint="Search any area, family, specialization or occupation.">
                <TextInput id="atlas-search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
              </Field>
            </div>
            {query.trim().length >= 2 ? (
              results.length > 0 ? (
                <ul className="mt-3 grid gap-2" aria-label="Search results">
                  {results.map((result) => (
                    <li key={result.id}>
                      <button type="button" onClick={() => { setQuery(""); openFromRoot(result.id); }} className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-left hover:bg-neutral-50 ${focusRing}`}>
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
          {comparePanelElement}
          {pursuing ? (
            <Card>
              <p className="text-sm text-neutral-600">Your direction</p>
              <h2 className="text-lg font-semibold">{graph.nodes.get(pursuing)?.title}</h2>
              <p className="mt-1 text-sm text-neutral-600">You chose this. You can change it any time; nothing else is hidden because of it.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => openFromRoot(pursuing)} className="w-full sm:w-auto">Open</Button>
                <Button variant="secondary" onClick={() => choose(pursuing)} className="w-full sm:w-auto">Stop pursuing this</Button>
              </div>
            </Card>
          ) : null}
          {question ? (
            <Card>
              <fieldset>
                <legend className="text-lg font-semibold">{question.prompt}</legend>
                <p className="mt-1 text-sm text-neutral-600">{persist ? ANSWERS_SAVED_NOTE : ANSWERS_NOTE}</p>
                <div className="mt-3 grid gap-2">
                  {([
                    ["a", question.a.label],
                    ["b", question.b.label],
                    ["both", ANSWER_LABELS.both],
                    ["unsure", ANSWER_LABELS.unsure],
                  ] as const).map(([value, label]) => (
                    <Button key={value} variant="secondary" onClick={() => answer(question.id, value)} className="w-full justify-start text-left">
                      {label}
                    </Button>
                  ))}
                  <button type="button" onClick={() => setSkipped((list) => [...list, question.id])} className={`min-h-12 self-start rounded px-1 text-sm text-sky-800 underline ${focusRing}`}>
                    Skip this question
                  </button>
                </div>
              </fieldset>
            </Card>
          ) : null}
          {showPicks ? (
            <section aria-label="Start here" className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Start here</h2>
              <p className="text-sm text-neutral-600">Ordered by what you told Swervly on this screen.</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {picks.slice(0, 3).map((item) => <PickCard key={item.id} item={item} onOpen={() => openFromRoot(item.id)} />)}
              </ul>
              {picks.length > 3 ? (
                <>
                  <h2 className="mt-2 text-lg font-semibold">Also worth a look</h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {picks.slice(3).map((item) => <PickCard key={item.id} item={item} onOpen={() => openFromRoot(item.id)} />)}
                  </ul>
                </>
              ) : null}
              {Object.keys(answers).length > 0 ? (
                <button type="button" onClick={clearAll} className={`min-h-12 self-start rounded px-1 text-sm text-sky-800 underline ${focusRing}`}>
                  Clear my answers
                </button>
              ) : null}
            </section>
          ) : null}
          {root.groups.map((group) => (
            <section key={group.title} aria-label={group.title} className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{group.title}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {group.cards.map((item) => (
                  <NodeCard key={item.id} item={item} onOpen={() => openFromRoot(item.id)} />
                ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{view.badge}</Badge>
              {view.onetCode ? <span className="text-sm text-neutral-600">O*NET-SOC {view.onetCode}</span> : null}
            </div>
            <h2 className="mt-2 text-xl font-semibold">{view.title}</h2>
            {view.summary ? <p className="mt-1 text-neutral-700">{view.summary}</p> : null}
            {view.details ? <p className="mt-2 text-neutral-800">{view.details.description}</p> : null}
            {view.closestOnly ? <p className="mt-2 text-sm text-neutral-600">{CLOSEST_LABEL}</p> : null}
            {view.onetCode && onetOnlineHref(view.onetCode) ? (
              <p className="mt-3 text-sm">
                <a href={onetOnlineHref(view.onetCode) ?? undefined} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-800 underline">
                  Read about this occupation on O*NET OnLine
                </a>{" "}
                <span className="text-neutral-600">(External)</span>
              </p>
            ) : null}
            {view.level !== "domain" ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant={marks.interested.includes(view.id) ? "primary" : "secondary"} aria-pressed={marks.interested.includes(view.id)} onClick={() => mark("interested", view.id)} className="w-full sm:w-auto">
                  {marks.interested.includes(view.id) ? "Interested ✓" : "Interested"}
                </Button>
                <Button variant="secondary" aria-pressed={marks.dismissed.includes(view.id)} onClick={() => mark("dismissed", view.id)} className="w-full sm:w-auto">
                  {marks.dismissed.includes(view.id) ? "Undo not interested" : "Not interested"}
                </Button>
                {view.level === "specialization" || view.level === "occupation" ? (
                  <Button variant={pursuing === view.id ? "primary" : "secondary"} aria-pressed={pursuing === view.id} onClick={() => choose(view.id)} className="w-full sm:w-auto">
                    {pursuing === view.id ? "My direction ✓" : "Make this my direction"}
                  </Button>
                ) : null}
                {view.level === "occupation" ? (
                  <Button
                    variant={compare.left === view.id || compare.right === view.id ? "primary" : "secondary"}
                    aria-pressed={compare.left === view.id || compare.right === view.id}
                    aria-expanded={compare.open}
                    aria-controls={COMPARE_PANEL_ID}
                    onClick={() => pickForCompare(view.id)}
                    className="w-full sm:w-auto"
                  >
                    {compare.left === view.id || compare.right === view.id ? "Comparing ✓" : "Compare"}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {notice ? <p className="mt-2 text-sm text-neutral-600" role="status">{notice}</p> : null}
          </Card>
          {comparePanelElement}

          {view.details ? (
            <Card>
              <h2 className="text-lg font-semibold">Typical tasks</h2>
              <p className="mt-1 text-sm text-neutral-600">{TASKS_NOTE}</p>
              <ul className="mt-2 list-disc pl-5 text-neutral-800">
                {view.details.tasks.map((task) => <li key={task} className="mt-1">{task}</li>)}
              </ul>
              <h2 className="mt-5 text-lg font-semibold">Skills that stand out</h2>
              {view.details.skills.length > 0 ? (
                <>
                  <p className="mt-1 text-sm text-neutral-600">{SKILLS_NOTE}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {view.details.skills.map((name) => (
                      <li key={name} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-800">{name}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-sm text-neutral-600">{NO_SKILLS_NOTE}</p>
              )}
              <h2 className="mt-5 text-lg font-semibold">Software in demand</h2>
              {view.details.software.length > 0 ? (
                <>
                  <p className="mt-1 text-sm text-neutral-600">{SOFTWARE_NOTE}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {view.details.software.map((name) => (
                      <li key={name} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-800">{name}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-sm text-neutral-600">{NO_SOFTWARE_NOTE}</p>
              )}
              {view.details.jobZone ? (
                <>
                  <h2 className="mt-5 text-lg font-semibold">Preparation usually needed</h2>
                  <p className="mt-1 font-medium text-neutral-900">{view.details.jobZone.name}</p>
                  <p className="mt-1 text-neutral-800">{view.details.jobZone.education}</p>
                </>
              ) : null}
            </Card>
          ) : null}

          {view.details && view.details.related.length > 0 ? (
            <Card>
              <h2 className="text-lg font-semibold">Related occupations</h2>
              <p className="mt-1 text-sm text-neutral-600">{RELATED_NOTE}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {view.details.related.map((item) => (
                  <li key={item.title}>
                    {item.id ? (
                      <button type="button" onClick={() => item.id && go(defaultTrail(graph, item.id))} className={`min-h-12 rounded-full border border-neutral-200 bg-white px-4 text-left text-sm text-sky-800 underline hover:bg-neutral-50 ${focusRing}`}>
                        {item.title}
                      </button>
                    ) : (
                      <span className="inline-flex min-h-12 items-center rounded-full bg-neutral-100 px-4 text-sm text-neutral-800">{item.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {view.childrenHeading ? (
            <section aria-label={view.childrenHeading} className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{view.childrenHeading}</h2>
              {view.children.length === 0 ? <p className="text-sm text-neutral-600">Everything here is hidden by your choices.</p> : null}
              <ul className="grid gap-2 sm:grid-cols-2">
                {view.children.map((item) => (
                  <NodeCard key={item.id} item={item} onOpen={() => openChild(item.id)} />
                ))}
              </ul>
              {view.hiddenChildren.length > 0 ? (
                <div>
                  <Button variant="secondary" aria-expanded={showHidden} onClick={() => setShowHidden((value) => !value)} className="w-full sm:w-auto">
                    {showHidden ? "Hide" : "Show"} {view.hiddenChildren.length} hidden by your choices
                  </Button>
                  {showHidden ? (
                    <ul className="mt-2 grid gap-2 opacity-70 sm:grid-cols-2">
                      {view.hiddenChildren.map((item) => (
                        <NodeCard key={item.id} item={item} onOpen={() => openChild(item.id)} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {companies.length > 0 ? (
            <Card>
              <h2 className="text-lg font-semibold">Organizations in this area</h2>
              <p className="mt-1 text-sm text-neutral-600">{COMPANY_NOTE}</p>
              <ul className="mt-3 grid gap-2">
                {(showAllCompanies ? companies : companies.slice(0, COMPANIES_SHOWN)).map((company) => (
                  <li key={company.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="font-medium text-neutral-900">{company.name}</p>
                    <p className="text-sm text-neutral-600">{company.field} · Listed under {company.areas.join(" and ")}</p>
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
                  aria-expanded={showAllCompanies}
                  onClick={() => setShowAllCompanies((value) => !value)}
                  className={`mt-2 min-h-12 rounded px-1 text-sm text-sky-800 underline ${focusRing}`}
                >
                  {showAllCompanies ? "Show fewer" : `Show all ${companies.length} organizations`}
                </button>
              ) : null}
            </Card>
          ) : null}

          {view.alsoUnder.length > 0 ? (
            <Card>
              <h2 className="text-lg font-semibold">Also found under</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {view.alsoUnder.map((item) => (
                  <li key={item.label}>
                    <button type="button" onClick={() => go(item.path)} className={`min-h-12 rounded-full border border-neutral-200 bg-white px-4 text-sm text-neutral-900 hover:bg-neutral-50 ${focusRing}`}>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <h2 className="text-lg font-semibold">Why this is shown</h2>
            <ul className="mt-2 list-disc pl-5 text-neutral-700">
              {view.why.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <h2 className="mt-4 text-lg font-semibold">What Swervly doesn&apos;t know yet</h2>
            <ul className="mt-2 list-disc pl-5 text-neutral-700">
              {view.unknowns.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </Card>
        </>
      )}

      <p className="text-xs text-neutral-500">
        Areas, families and specializations are Swervly&apos;s own grouping. {ONET_CREDIT}
      </p>
    </div>
  );
}
