"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { focusRing } from "@/components/ui/controls";
import { parseSettings, parseTaskDraft } from "@/features/action-ui/adapter";
import { dispatchAction, isSkillProgress, isTaskStatus, loadAfterDispatch } from "@/features/action-ui/api";
import { GoalHeader } from "@/features/action-ui/components/goal-header";
import { GoalPicker } from "@/features/action-ui/components/goal-picker";
import { MilestoneList } from "@/features/action-ui/components/milestone-list";
import { NextActions } from "@/features/action-ui/components/next-actions";
import { SkillBoard } from "@/features/action-ui/components/skill-board";
import { ErrorState, LoadingState, SaveStatus, UnavailableState } from "@/features/action-ui/components/states";
import type { TaskDraft } from "@/features/action-ui/components/task-form";
import { WeekSummary } from "@/features/action-ui/components/week-summary";
import type { ActionDataSource } from "@/features/action-ui/source";
import type { DashboardLoad, PursuingDisplay, RetryAction, SaveNotice, TaskPhase } from "@/features/action-ui/types";
import { nextThree } from "@/features/action-ui/view";
import { ROUTES } from "@/lib/constants";

const JUMPS = [
  ["#next", "Next"],
  ["#steps", "Steps"],
  ["#skills", "Skills"],
  ["#week", "This week"],
] as const;

export function ActionDashboard({
  source,
  initial,
  pursuing,
  initialNotice = { status: "idle" },
  now,
}: {
  source: ActionDataSource;
  initial: DashboardLoad;
  pursuing: PursuingDisplay | null;
  initialNotice?: SaveNotice;
  now?: Date;
}) {
  const [load, setLoad] = useState(initial);
  const [notice, setNotice] = useState<SaveNotice>(initialNotice);
  const [confirming, setConfirming] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const loadRef = useRef(load);
  const savingRef = useRef(false);
  const retryRef = useRef<(() => void) | null>(null);
  const settingsSubmit = useRef<() => void>(() => {});
  const taskSubmit = useRef<(() => void) | null>(null);
  const goalSubmit = useRef<(() => void) | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  loadRef.current = load;

  useEffect(() => {
    if (source !== "api" || initial.status !== "loading") return;
    let cancelled = false;
    void dispatchAction({ source, load: { status: "loading" }, retry: { kind: "reload" }, pursuing }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setLoad(result.load);
        return;
      }
      setLoad(result.unavailable ? { status: "unavailable" } : { status: "error", message: result.message });
    });
    return () => {
      cancelled = true;
    };
  }, [source, initial.status, pursuing]);

  useEffect(() => {
    if (notice.status === "error") alertRef.current?.focus();
  }, [notice]);

  function remember(retry: RetryAction) {
    retryRef.current = () => {
      void commit(retry);
    };
  }

  async function commit(retry: RetryAction): Promise<boolean> {
    if (savingRef.current) return false;
    savingRef.current = true;
    remember(retry);
    setNotice({ status: "saving" });
    const current = loadRef.current;
    try {
      const result = await dispatchAction({ source, load: current, retry, pursuing, now });
      setLoad(loadAfterDispatch(current, result));
      if (result.ok) {
        setNotice({ status: "saved" });
        if (retry.kind === "update-task") setEditingId((id) => (id === retry.id ? null : id));
        if (retry.kind === "delete-task") setDeletingId((id) => (id === retry.id ? null : id));
        if (retry.kind === "add-task") setAdding(false);
        if (retry.kind === "seed-atlas" || retry.kind === "seed-manual" || retry.kind === "change-goal-atlas" || retry.kind === "change-goal-manual") {
          setConfirming(false);
        }
        return true;
      }
      setNotice({ status: "error", message: result.message, retry });
      return false;
    } finally {
      savingRef.current = false;
    }
  }

  function fail(message: string, retry: RetryAction) {
    remember(retry);
    setNotice({ status: "error", message, retry });
  }

  function saveSettings(hours: string, weeks: string) {
    const parsed = parseSettings(hours, weeks);
    if (!parsed.ok) {
      fail(parsed.message, { kind: "settings", weeklyHours: null, horizonWeeks: null });
      retryRef.current = () => saveSettings(hours, weeks);
      return;
    }
    void commit({ kind: "settings", weeklyHours: parsed.weeklyHours, horizonWeeks: parsed.horizonWeeks });
  }

  function saveGoal(kind: "seed-atlas" | "seed-manual" | "change-goal-atlas" | "change-goal-manual", nodeId: string | null, hours: string, weeks: string) {
    const parsed = parseSettings(hours, weeks);
    if (!parsed.ok) {
      const retry: RetryAction = nodeId
        ? { kind: kind === "seed-atlas" || kind === "change-goal-atlas" ? "seed-manual" : kind, nodeId, weeklyHours: null, horizonWeeks: null }
        : { kind: kind === "change-goal-manual" ? "change-goal-atlas" : "seed-atlas", weeklyHours: null, horizonWeeks: null };
      fail(parsed.message, retry);
      retryRef.current = () => saveGoal(kind, nodeId, hours, weeks);
      return;
    }
    if (kind === "seed-manual" || kind === "change-goal-manual") {
      if (!nodeId) return;
      void commit({ kind, nodeId, weeklyHours: parsed.weeklyHours, horizonWeeks: parsed.horizonWeeks });
      return;
    }
    void commit({ kind, weeklyHours: parsed.weeklyHours, horizonWeeks: parsed.horizonWeeks });
  }

  function saveEdit(id: string, draft: TaskDraft) {
    const parsed = parseTaskDraft(draft);
    if (!parsed.ok) {
      fail(parsed.message, { kind: "update-task", id, patch: { title: draft.title } });
      retryRef.current = () => saveEdit(id, draft);
      return;
    }
    const phase: TaskPhase | null = draft.phase === "" ? null : draft.phase;
    void commit({
      kind: "update-task",
      id,
      patch: { title: parsed.title, description: parsed.description, phase, dueOn: parsed.dueOn, status: draft.status },
    });
  }

  function createTask(draft: TaskDraft) {
    const parsed = parseTaskDraft(draft);
    if (!parsed.ok) {
      fail(parsed.message, { kind: "add-task", title: draft.title, description: null, phase: null, dueOn: null });
      retryRef.current = () => createTask(draft);
      return;
    }
    const phase: TaskPhase | null = draft.phase === "" ? null : draft.phase;
    void commit({ kind: "add-task", title: parsed.title, description: parsed.description, phase, dueOn: parsed.dueOn });
  }

  const pending = notice.status === "saving";
  function retrySave() {
    if (notice.status !== "error") return;
    const kind = notice.retry.kind;
    if (kind === "settings") {
      settingsSubmit.current();
      return;
    }
    if (((kind === "add-task" && adding) || (kind === "update-task" && editingId)) && taskSubmit.current) {
      taskSubmit.current();
      return;
    }
    const goalOpen = load.status === "empty" || confirming;
    if (
      goalOpen &&
      (kind === "seed-atlas" || kind === "seed-manual" || kind === "change-goal-atlas" || kind === "change-goal-manual") &&
      goalSubmit.current
    ) {
      goalSubmit.current();
      return;
    }
    retryRef.current?.();
  }
  const alert = (
    <div ref={alertRef} tabIndex={-1} className="outline-none">
      <SaveStatus notice={notice} onRetry={retrySave} />
    </div>
  );

  if (load.status === "loading") return <LoadingState />;
  if (load.status === "unavailable") {
    return <UnavailableState message={notice.status === "error" ? notice.message : undefined} onRetry={() => void commit({ kind: "reload" })} />;
  }
  if (load.status === "error") return <ErrorState message={load.message} onRetry={() => void commit({ kind: "reload" })} />;

  if (load.status === "empty") {
    return (
      <div className="grid gap-4">
        {alert}
        <section className="glass rounded-[22px] p-5 sm:p-6">
          <GoalPicker
            pursuing={pursuing}
            mode="seed"
            pending={pending}
            onAtlas={(hours, weeks) => saveGoal("seed-atlas", null, hours, weeks)}
            onManual={(nodeId, hours, weeks) => saveGoal("seed-manual", nodeId, hours, weeks)}
            onRegister={(submit) => {
              goalSubmit.current = submit;
            }}
          />
        </section>
        <PrivacyLink />
      </div>
    );
  }

  const dashboard = load.dashboard;
  const savedHours = dashboard.weeklyHours?.toString() ?? "";
  const savedWeeks = dashboard.horizonWeeks?.toString() ?? "";

  return (
    <div className="grid gap-4">
      <GoalHeader
        dashboard={dashboard}
        pending={pending}
        onSave={saveSettings}
        onChangeGoal={() => setConfirming(true)}
        onRegister={(submit) => {
          settingsSubmit.current = submit;
        }}
      />
      <nav aria-label="On this page" className="flex flex-wrap gap-2 md:hidden">
        {JUMPS.map(([href, label]) => (
          <a key={href} href={href} className={`inline-flex min-h-12 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.06)] ${focusRing}`}>
            {label}
          </a>
        ))}
      </nav>
      {confirming ? null : alert}
      <NextActions tasks={nextThree(dashboard.tasks)} pending={pending} onStatus={(id) => void commit({ kind: "update-task", id, patch: { status: "done" } })} />
      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-3 md:col-start-3 md:row-start-1">
          <MilestoneList
            tasks={dashboard.tasks}
            pending={pending}
            editingId={editingId}
            adding={adding}
            deletingId={deletingId}
            onStatus={(id, status) => {
              if (!isTaskStatus(status)) return;
              void commit({ kind: "update-task", id, patch: { status } });
            }}
            onEdit={(id) => {
              setAdding(false);
              setDeletingId(null);
              setEditingId(id);
            }}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={saveEdit}
            onAskDelete={(id) => {
              setEditingId(null);
              setDeletingId(id);
            }}
            onConfirmDelete={(id) => void commit({ kind: "delete-task", id })}
            onCancelDelete={() => setDeletingId(null)}
            onAdd={() => {
              setEditingId(null);
              setAdding(true);
            }}
            onCancelAdd={() => setAdding(false)}
            onCreate={createTask}
            onRegister={(submit) => {
              taskSubmit.current = submit;
            }}
          />
        </div>
        <div className="md:col-span-2 md:col-start-1 md:row-start-1">
          <SkillBoard
            skills={dashboard.skills}
            pending={pending}
            onRate={(id, progress) => {
              if (!isSkillProgress(progress)) return;
              void commit({ kind: "rate-skill", id, progress });
            }}
          />
        </div>
        <div className="md:col-span-5">
          <WeekSummary tasks={dashboard.tasks} weeklyHours={dashboard.weeklyHours} horizonWeeks={dashboard.horizonWeeks} now={now} />
        </div>
      </div>
      <PrivacyLink />
      {confirming ? (
        <Modal onClose={() => setConfirming(false)}>
          {notice.status === "error" ? alert : null}
          <GoalPicker
            pursuing={pursuing}
            mode="change"
            pending={pending}
            initialHours={savedHours}
            initialWeeks={savedWeeks}
            onAtlas={(hours, weeks) => saveGoal("change-goal-atlas", null, hours, weeks)}
            onManual={(nodeId, hours, weeks) => saveGoal("change-goal-manual", nodeId, hours, weeks)}
            onCancel={() => setConfirming(false)}
            onRegister={(submit) => {
              goalSubmit.current = submit;
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function PrivacyLink() {
  return (
    <p className="text-sm text-ink-3">
      <a className={`font-semibold text-accent underline-offset-4 hover:underline ${focusRing}`} href={ROUTES.privacy}>
        Privacy Policy
      </a>
    </p>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    return () => {
      closing.current = true;
      if (el.open) el.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="change-goal-title"
      className="w-[calc(100%-2rem)] max-w-lg rounded-[22px] border-0 p-5 backdrop:bg-[rgba(11,18,32,0.45)]"
      onClose={() => {
        if (closing.current) return;
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
