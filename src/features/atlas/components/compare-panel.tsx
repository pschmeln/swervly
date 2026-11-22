"use client";

import { Button } from "@/components/ui";
import { focusRing } from "@/components/ui/controls";
import {
  DIRECTION_COLUMN_NOTE,
  EMPTY_SIDE_HINT,
  EMPTY_SIDE_PROMPT,
  type ComparePanelModel,
  type CompareSlot,
  type DirectionColumn,
} from "@/features/atlas/compare";
import type { AtlasNodeId } from "@/features/atlas/types";
import type { CompareSide } from "@/features/atlas/view";

export const COMPARE_PANEL_ID = "compare-panel";

function SideDetails({ side }: { side: CompareSide }) {
  return (
    <>
      <p className="text-xs text-neutral-600">O*NET-SOC {side.onetCode}</p>
      {side.description ? <p className="mt-2 text-sm text-neutral-800">{side.description}</p> : null}
      <h4 className="mt-3 text-sm font-semibold">Top tasks</h4>
      <ul className="mt-1 list-disc pl-5 text-sm text-neutral-800">
        {side.tasks.map((task) => <li key={task}>{task}</li>)}
      </ul>
      <h4 className="mt-3 text-sm font-semibold">Skills that stand out</h4>
      <p className="text-sm text-neutral-800">{side.skills.length > 0 ? side.skills.join(", ") : "No usable O*NET ratings."}</p>
      <h4 className="mt-3 text-sm font-semibold">Software in demand</h4>
      <p className="text-sm text-neutral-800">{side.software.length > 0 ? side.software.join(", ") : "None flagged by O*NET."}</p>
      {side.preparation ? (
        <>
          <h4 className="mt-3 text-sm font-semibold">Preparation</h4>
          <p className="text-sm text-neutral-800">{side.preparation}</p>
        </>
      ) : null}
      <h4 className="mt-3 text-sm font-semibold">Areas in this map</h4>
      <p className="text-sm text-neutral-800">{side.areas.join(", ")}</p>
    </>
  );
}

function FilledSide({ side, onClear }: { side: CompareSide; onClear: () => void }) {
  return (
    <section aria-label={side.title} className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="break-words font-semibold text-neutral-900">{side.title}</h3>
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${side.title}`}
          className={`min-h-12 shrink-0 rounded px-2 text-sm text-sky-800 underline ${focusRing}`}
        >
          Clear
        </button>
      </div>
      <SideDetails side={side} />
    </section>
  );
}

function EmptySide({ picks, onPick }: { picks: ComparePanelModel["quickPicks"]; onPick: (id: AtlasNodeId) => void }) {
  return (
    <section
      aria-label={EMPTY_SIDE_PROMPT}
      className="flex min-h-40 min-w-0 flex-col justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-4"
    >
      <p className="font-semibold text-neutral-900">{EMPTY_SIDE_PROMPT}</p>
      {picks.length > 0 ? (
        <>
          <p className="mt-1 text-sm text-neutral-600">{EMPTY_SIDE_HINT}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {picks.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item.id)}
                  className={`min-h-12 rounded-full border border-neutral-200 bg-white px-4 text-left text-sm text-sky-800 underline hover:bg-neutral-50 ${focusRing}`}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-neutral-600">Open any occupation in the map and tap Compare.</p>
      )}
    </section>
  );
}

function DirectionSide({ column }: { column: DirectionColumn }) {
  const title = column.kind === "occupation" ? column.side.title : column.title;
  return (
    <section aria-label={`Your direction: ${title}`} className="min-w-0 rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">Your direction</p>
      <h3 className="mt-1 break-words font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-xs text-neutral-600">{DIRECTION_COLUMN_NOTE}</p>
      {column.kind === "occupation" ? (
        <SideDetails side={column.side} />
      ) : (
        <>
          <p className="mt-2 text-sm text-neutral-800">{column.summary}</p>
          {column.occupations.length > 0 ? (
            <>
              <h4 className="mt-3 text-sm font-semibold">Occupations in this specialization</h4>
              <p className="text-sm text-neutral-800">{column.occupations.map((item) => item.title).join(", ")}</p>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

export function ComparePanel({
  model,
  onPick,
  onClear,
  onClose,
}: {
  model: ComparePanelModel;
  onPick: (id: AtlasNodeId) => void;
  onClear: (side: CompareSlot) => void;
  onClose: () => void;
}) {
  const columns = model.direction ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";
  return (
    <section
      id={COMPARE_PANEL_ID}
      aria-labelledby="compare-heading"
      className="scroll-mt-4 rounded-3xl border border-neutral-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="compare-heading" className="text-lg font-semibold">Compare occupations</h2>
        <Button variant="secondary" onClick={onClose} className="shrink-0">Close</Button>
      </div>
      <div className={`mt-3 grid gap-4 ${columns}`}>
        {model.left ? <FilledSide side={model.left} onClear={() => onClear("left")} /> : <EmptySide picks={model.quickPicks} onPick={onPick} />}
        {model.right ? <FilledSide side={model.right} onClear={() => onClear("right")} /> : <EmptySide picks={model.quickPicks} onPick={onPick} />}
        {model.direction ? <DirectionSide column={model.direction} /> : null}
      </div>
      {model.shared ? (
        <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700">
          <li>{model.shared.skills.length > 0 ? `Both stand out for: ${model.shared.skills.join(", ")}.` : "No standout skills in common."}</li>
          <li>{model.shared.software.length > 0 ? `Software in both: ${model.shared.software.join(", ")}.` : "No in-demand software in common."}</li>
          {model.shared.areas.length > 0 ? <li>{`Both sit under: ${model.shared.areas.join(", ")}.`}</li> : null}
        </ul>
      ) : null}
    </section>
  );
}
