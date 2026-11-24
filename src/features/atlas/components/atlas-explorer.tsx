"use client";

import { useMemo, useReducer, useState } from "react";
import { rankByHomeArea, type HomeArea } from "@/features/location/area";
import { Button, Card } from "@/components/ui";
import { ONET_CREDIT } from "@/content/atlas/occupations";
import type { QuestionAnswer } from "@/content/atlas/questions";
import { hasSignals, nextQuestion, questionPool, rankSpecializations, topPicks, type Answers } from "@/features/atlas/rank";
import type { AtlasEntry } from "@/features/atlas/entry";
import { comparePanel, compareFrom, compareReducer } from "@/features/atlas/compare";
import {
  AlsoUnder,
  Badge,
  Breadcrumbs,
  CardGroup,
  ChildrenSection,
  OccupationDetails,
  OrganizationsCard,
  PicksSection,
  PursuingCard,
  QuestionCard,
  RelatedOccupations,
  SearchCard,
  WhyShown,
} from "@/features/atlas/components/atlas-sections";
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
  nodeModel,
  onetOnlineHref,
  rootModel,
  searchAtlas,
  type Marks,
} from "@/features/atlas/view";

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
  homeArea = null,
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
  /** Home city and radius: organizations headquartered inside it are listed first. */
  homeArea?: HomeArea | null;
}) {
  const persist = saved?.available === true;
  const graph = atlasGraph();
  const [trail, setTrail] = useState<AtlasNodeId[]>(() => (initialFocus ? defaultTrail(graph, initialFocus) : []));
  const [marks, setMarks] = useState<Marks>({ interested: saved?.interested ?? [], dismissed: saved?.dismissed ?? [] });
  const [pursuing, setPursuing] = useState<AtlasNodeId | null>(saved?.pursuing ?? null);
  const [query, setQuery] = useState("");
  // Bumped on every navigation, so per-node sections (hidden careers, all organizations) start folded.
  const [visit, setVisit] = useState(0);
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
  const companies = useMemo(
    () => rankByHomeArea(current ? companiesFor(graph, current) : [], homeArea),
    [graph, current, homeArea],
  );

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
      pursuing={pursuing}
      onPick={pickForCompare}
      onClear={(side) => dispatchCompare({ type: "clear", side })}
      onChoose={choose}
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
    setVisit((count) => count + 1);
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

      <Breadcrumbs crumbs={crumbs} onGo={(depth) => go(trail.slice(0, depth))} />

      {view === null ? (
        <>
          <SearchCard heading={root.heading} note={root.note} query={query} results={results} onQuery={setQuery} onOpen={openFromRoot} />
          {comparePanelElement}
          {pursuing ? (
            <PursuingCard title={graph.nodes.get(pursuing)?.title} onOpen={() => openFromRoot(pursuing)} onStop={() => choose(pursuing)} />
          ) : null}
          {question ? (
            <QuestionCard
              question={question}
              note={persist ? ANSWERS_SAVED_NOTE : ANSWERS_NOTE}
              onAnswer={(value) => answer(question.id, value)}
              onSkip={() => setSkipped((list) => [...list, question.id])}
            />
          ) : null}
          {showPicks ? (
            <PicksSection picks={picks} canClear={Object.keys(answers).length > 0} onOpen={openFromRoot} onClear={clearAll} />
          ) : null}
          {root.groups.map((group) => (
            <CardGroup key={group.title} title={group.title} cards={group.cards} onOpen={openFromRoot} />
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

          {view.details ? <OccupationDetails details={view.details} /> : null}
          {view.details && view.details.related.length > 0 ? (
            <RelatedOccupations related={view.details.related} onOpen={(id) => go(defaultTrail(graph, id))} />
          ) : null}
          {view.childrenHeading ? (
            <ChildrenSection key={visit} heading={view.childrenHeading} shown={view.children} hidden={view.hiddenChildren} onOpen={openChild} />
          ) : null}
          {companies.length > 0 ? <OrganizationsCard key={visit} companies={companies} /> : null}
          {view.alsoUnder.length > 0 ? <AlsoUnder items={view.alsoUnder} onGo={go} /> : null}
          <WhyShown why={view.why} unknowns={view.unknowns} />
        </>
      )}

      <p className="text-xs text-neutral-500">
        Areas, families and specializations are Swervly&apos;s own grouping. {ONET_CREDIT}
      </p>
    </div>
  );
}
