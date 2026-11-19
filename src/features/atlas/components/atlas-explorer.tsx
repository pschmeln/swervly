"use client";

import { useMemo, useState } from "react";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { ONET_CHECKED_ON, ONET_CREDIT } from "@/content/atlas/occupations";
import type { AtlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";
import type { AtlasNodeId } from "@/features/atlas/types";
import {
  ATLAS_BANNER,
  CLOSEST_LABEL,
  defaultTrail,
  MARK_NOTE,
  nodeModel,
  onetOnlineHref,
  rootModel,
  searchAtlas,
  type CardModel,
  type Marks,
} from "@/features/atlas/view";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

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

export function AtlasExplorer({
  entry,
  dismissedRoles,
  initialFocus,
}: {
  entry: AtlasEntry;
  /** Direction role ids the student dismissed. Read only. */
  dismissedRoles: readonly string[];
  initialFocus: AtlasNodeId | null;
}) {
  const graph = atlasGraph();
  const [trail, setTrail] = useState<AtlasNodeId[]>(() => (initialFocus ? defaultTrail(graph, initialFocus) : []));
  const [marks, setMarks] = useState<Marks>({ interested: [], dismissed: [] });
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const current = trail.at(-1) ?? null;
  const root = useMemo(() => rootModel(graph, entry, marks, dismissedRoles), [graph, entry, marks, dismissedRoles]);
  const view = useMemo(
    () => (current ? nodeModel(graph, entry, current, trail, marks, dismissedRoles) : null),
    [graph, entry, current, trail, marks, dismissedRoles],
  );
  const results = useMemo(() => searchAtlas(graph, query), [graph, query]);

  function go(next: AtlasNodeId[]) {
    setTrail(next);
    setShowHidden(false);
    setNotice(null);
  }

  function openChild(id: AtlasNodeId) {
    go([...trail, id]);
  }

  function openFromRoot(id: AtlasNodeId) {
    go(defaultTrail(graph, id));
  }

  function mark(kind: "interested" | "dismissed", id: AtlasNodeId) {
    setMarks((previous) => {
      const on = previous[kind].includes(id);
      const other = kind === "interested" ? "dismissed" : "interested";
      return {
        ...previous,
        [kind]: on ? previous[kind].filter((item) => item !== id) : [...previous[kind], id],
        [other]: on ? previous[other] : previous[other].filter((item) => item !== id),
      };
    });
    setNotice(MARK_NOTE);
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
              </div>
            ) : null}
            {notice ? <p className="mt-2 text-sm text-neutral-600" role="status">{notice}</p> : null}
          </Card>

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
        Areas, families and specializations are Swervly&apos;s own grouping. {ONET_CREDIT} Codes checked {ONET_CHECKED_ON}.
      </p>
    </div>
  );
}
