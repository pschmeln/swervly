"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button, Card, ErrorNote, Field, Select, Textarea, TextInput } from "@/components/ui";
import { careerPageHref } from "@/features/explore/links";
import {
  addAnswer,
  addQuestion,
  BOOKMARK_HINT,
  companiesForRole,
  filterQuestions,
  HELPFUL_LABEL,
  HELPFUL_MARKED_LABEL,
  markPreview,
  noteReport,
  NOT_SENT,
  PREVIEW_HIDDEN_LABEL,
  PREVIEW_ONLY,
  PREVIEW_VISIBLE_LABEL,
  REPORT_REASONS,
  SAVE_LABEL,
  SAVED_LABEL,
  toggleHelpful,
  toggleSaved,
} from "@/features/explore/local-state";
import {
  DEMO_DISCUSSIONS_LABEL,
  DEMO_FOUNDER_LABEL,
  DEMO_PREVIEW_LABEL,
  DEMO_PREVIEW_NOTE,
  DIRECTORY_EXPERIENCE_LINE,
  PROTOTYPE_BANNER,
  SAMPLE_EXPERIENCES_LABEL,
  type CompanyCardModel,
  type ExploreModel,
  type LocalQuestion,
} from "@/features/explore/types";
import { ROUTES } from "@/lib/constants";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

const SECTIONS = [
  { href: "#your-direction", label: "Your direction" },
  { href: "#career-paths", label: "Explore career paths" },
  { href: "#companies", label: "Companies & opportunities" },
  { href: "#demo-preview", label: DEMO_PREVIEW_LABEL },
] as const;

function PrototypeNote() {
  return (
    <p role="note" className="rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900">
      {PROTOTYPE_BANNER}
    </p>
  );
}

function SectionNav() {
  return (
    <nav aria-label="Exploration sections" className="flex flex-wrap gap-1">
      {SECTIONS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={`inline-flex min-h-12 items-center rounded-xl px-3 text-base font-medium text-neutral-900 ${focusRing}`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function OfficialCareersLink({ url, checkedOn }: { url: string | null; checkedOn: string | null }) {
  const href = url ? careerPageHref(url) : null;
  if (!href) {
    return <p className="text-neutral-800">No official careers page is on file.</p>;
  }
  return (
    <p className="text-neutral-800">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex min-h-12 flex-wrap items-center gap-2 underline underline-offset-2 ${focusRing}`}
      >
        Official careers page
        <span className="inline-flex items-center rounded border border-neutral-300 px-1.5 text-xs font-medium no-underline">
          External
        </span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      {checkedOn ? <span className="mt-1 block text-sm text-neutral-600">Link checked {checkedOn}.</span> : null}
    </p>
  );
}

function DirectionSection({ model }: { model: ExploreModel }) {
  return (
    <section id="your-direction" aria-labelledby="your-direction-heading" className="scroll-mt-6 grid gap-3">
      <h2 id="your-direction-heading" className="text-lg font-semibold">
        Your direction
      </h2>
      <Card>
        <h3 className="text-base font-semibold">Your profile</h3>
        <dl className="mt-3 grid gap-2">
          <div>
            <dt className="text-sm text-neutral-600">Major</dt>
            <dd className="break-words font-medium text-neutral-900">{model.profile.majorLabel}</dd>
          </div>
          <div>
            <dt className="text-sm text-neutral-600">Goal</dt>
            <dd className="break-words text-neutral-800">{model.profile.goalLabel}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-neutral-600">{model.profile.note}</p>
        <div className="mt-4">
          <Button href={ROUTES.profile} variant="secondary" className="w-full sm:w-auto">
            Edit your profile
          </Button>
        </div>
      </Card>
      <Card>
        <h3 className="text-base font-semibold">Direction</h3>
        <p className="mt-2 break-words text-neutral-800">{model.direction.headline}</p>
        <p className="mt-2 text-sm text-neutral-600">{model.direction.note}</p>
        {model.direction.needsQuiz ? (
          <div className="mt-4">
            <Button href={`${ROUTES.onboarding}?retake=1`} className="w-full sm:w-auto">
              Take the quiz
            </Button>
          </div>
        ) : null}
        {model.direction.exhausted ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button href={`${ROUTES.onboarding}?retake=1`} className="w-full sm:w-auto">
              Retake the quiz
            </Button>
            <Button href={ROUTES.directionAtlas} variant="secondary" className="w-full sm:w-auto">
              Browse the career map
            </Button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

function PathsSection({ model }: { model: ExploreModel }) {
  return (
    <section id="career-paths" aria-labelledby="career-paths-heading" className="scroll-mt-6 grid gap-3">
      <h2 id="career-paths-heading" className="text-lg font-semibold">
        Explore career paths
      </h2>
      <p className="text-neutral-700">{model.pathsIntro}</p>
      {model.pathsEmpty ? <p className="text-neutral-800">{model.pathsEmpty}</p> : null}
      <ul className="grid gap-3">
        {model.paths.map((path) => (
          <li key={path.id}>
            <Card>
              <h3 className="text-base font-semibold">{path.title}</h3>
              {path.sourceLabel ? <p className="mt-1 text-sm text-neutral-600">{path.sourceLabel}</p> : null}
              <p className="mt-1 text-neutral-800">{path.summary}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExperiencesSection({ model }: { model: ExploreModel }) {
  return (
    <section id="student-experiences" aria-labelledby="student-experiences-heading" className="grid gap-3">
      <h3 id="student-experiences-heading" className="text-lg font-semibold">
        {SAMPLE_EXPERIENCES_LABEL}
      </h3>
      <p className="text-neutral-700">Only invented notes marked as shared are listed here.</p>
      {model.experiences.length === 0 ? (
        <p className="text-neutral-800">No shared sample experiences yet.</p>
      ) : (
        <ul className="grid gap-3">
          {model.experiences.map((experience) => (
            <li key={experience.id}>
              <Card>
                <h3 className="break-words text-base font-semibold">{experience.companyName}</h3>
                <p className="text-sm text-neutral-600">{experience.role}</p>
                <p className="mt-1 text-sm text-neutral-600">{experience.authorLabel} · sample · marked as shared</p>
                <p className="mt-2 break-words text-neutral-800">{experience.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HelpfulButton({
  targetId,
  labelFor,
  marked,
  sampleCount,
  notice,
  onToggle,
}: {
  targetId: string;
  labelFor: string;
  marked: boolean;
  sampleCount: number;
  notice: string | undefined;
  onToggle: (targetId: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-sm text-neutral-600">Sample marks: {sampleCount}</p>
      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        aria-pressed={marked}
        aria-label={marked ? `Helpful mark for ${labelFor}, on this screen` : `Mark ${labelFor} helpful on this screen`}
        onClick={() => onToggle(targetId)}
      >
        {marked ? HELPFUL_MARKED_LABEL : HELPFUL_LABEL}
      </Button>
      {notice ? (
        <p role="status" className="text-sm text-neutral-700">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

function QuestionCard({
  question,
  helpfulIds,
  notices,
  answerDraft,
  answerError,
  reportReason,
  reportError,
  onHelpful,
  onAnswerDraft,
  onAnswer,
  onReportReason,
  onReport,
}: {
  question: LocalQuestion;
  helpfulIds: readonly string[];
  notices: Record<string, string>;
  answerDraft: string;
  answerError: string | undefined;
  reportReason: string;
  reportError: string | undefined;
  onHelpful: (targetId: string) => void;
  onAnswerDraft: (questionId: string, value: string) => void;
  onAnswer: (questionId: string, body: string) => void;
  onReportReason: (questionId: string, value: string) => void;
  onReport: (questionId: string, title: string, reasonValue: string) => void;
}) {
  return (
    <article aria-labelledby={`question-${question.id}`} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 id={`question-${question.id}`} className="break-words text-base font-semibold">
        {question.title}
      </h3>
      <p className="mt-1 text-sm text-neutral-600">
        {question.authorLabel}
        {question.localOnly ? " · only on this screen" : " · sample"}
        {" · "}
        {question.scopeLabel}
      </p>
      <p className="mt-2 break-words text-neutral-800">{question.body}</p>
      {question.localOnly ? <p className="mt-2 text-sm text-neutral-700">{NOT_SENT}</p> : null}
      <div className="mt-3">
        <HelpfulButton
          targetId={question.id}
          labelFor={question.title}
          marked={helpfulIds.includes(question.id)}
          sampleCount={question.sampleHelpfulCount}
          notice={notices[`helpful:${question.id}`]}
          onToggle={onHelpful}
        />
      </div>
      <div className="mt-4 grid gap-3">
        <h4 className="text-sm font-medium text-neutral-900">Answers</h4>
        {question.answers.length === 0 ? <p className="text-neutral-800">No sample answers yet.</p> : null}
        <ul className="grid gap-3">
          {question.answers.map((answer) => (
            <li key={answer.id} className="border-t border-neutral-200 pt-3">
              <p className="text-sm text-neutral-600">
                {answer.authorLabel}
                {answer.localOnly ? " · only on this screen" : " · sample"}
              </p>
              <p className="mt-1 break-words text-neutral-800">{answer.body}</p>
              {answer.localOnly ? <p className="mt-1 text-sm text-neutral-700">{NOT_SENT}</p> : null}
              <div className="mt-2">
                <HelpfulButton
                  targetId={answer.id}
                  labelFor={`answer by ${answer.authorLabel}`}
                  marked={helpfulIds.includes(answer.id)}
                  sampleCount={answer.sampleHelpfulCount}
                  notice={notices[`helpful:${answer.id}`]}
                  onToggle={onHelpful}
                />
              </div>
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onAnswer(question.id, answerDraft);
          }}
        >
          <Field label="Your sample answer" htmlFor={`answer-${question.id}`} hint="Kept on this screen only.">
            <Textarea
              id={`answer-${question.id}`}
              value={answerDraft}
              maxLength={800}
              onChange={(event) => onAnswerDraft(question.id, event.target.value)}
            />
          </Field>
          {answerError ? <ErrorNote>{answerError}</ErrorNote> : null}
          {notices[`answer:${question.id}`] ? (
            <p role="status" className="text-sm text-neutral-700">
              {notices[`answer:${question.id}`]}
            </p>
          ) : null}
          <Button type="submit" variant="secondary" className="w-full sm:w-auto">
            Add answer on this screen
          </Button>
        </form>
      </div>
      <details className="mt-4">
        <summary className={`flex min-h-12 cursor-pointer items-center text-base font-medium text-neutral-900 ${focusRing}`}>
          Report this sample
        </summary>
        <form
          className="mt-3 grid gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onReport(question.id, question.title, reportReason);
          }}
        >
          <Field label="Reason" htmlFor={`report-reason-${question.id}`}>
            <Select
              id={`report-reason-${question.id}`}
              value={reportReason}
              placeholder="Choose a reason"
              options={REPORT_REASONS.map((reason) => ({ value: reason.value, label: reason.label }))}
              onChange={(value) => onReportReason(question.id, value)}
            />
          </Field>
          {reportError ? <ErrorNote>{reportError}</ErrorNote> : null}
          {notices[`report:${question.id}`] ? (
            <p role="status" className="text-sm text-neutral-700">
              {notices[`report:${question.id}`]}
            </p>
          ) : null}
          <Button type="submit" variant="secondary" className="w-full sm:w-auto">
            Note on this screen
          </Button>
        </form>
      </details>
    </article>
  );
}

function CommunitySection({ model }: { model: ExploreModel }) {
  const [questions, setQuestions] = useState(model.questions);
  const [reports, setReports] = useState(model.reports);
  const [helpfulIds, setHelpfulIds] = useState<string[]>([]);
  const [browse, setBrowse] = useState("all");
  const [topic, setTopic] = useState(model.scopes[0]?.value ?? "");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [askError, setAskError] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [reportReasons, setReportReasons] = useState<Record<string, string>>({});
  const [reportErrors, setReportErrors] = useState<Record<string, string>>({});
  const [notices, setNotices] = useState<Record<string, string>>({});
  const seq = useRef(1);

  function nextId(prefix: string): string {
    const id = `${prefix}-${seq.current}`;
    seq.current += 1;
    return id;
  }

  function putNotice(key: string, text: string) {
    setNotices((current) => ({ ...current, [key]: text }));
  }

  function onAsk(event: FormEvent) {
    event.preventDefault();
    const result = addQuestion(
      questions,
      { scopeValue: topic, title, body: details, id: nextId("local-q") },
      model.scopes,
    );
    if (!result.ok) {
      setAskError(result.error);
      return;
    }
    setAskError(null);
    setQuestions(result.questions);
    setTitle("");
    setDetails("");
    putNotice("ask", result.notice);
  }

  const visible = filterQuestions(questions, browse);

  return (
    <section id="community" aria-labelledby="community-heading" className="grid gap-3">
      <h3 id="community-heading" className="text-lg font-semibold">
        {DEMO_DISCUSSIONS_LABEL}
      </h3>
      <p className="text-neutral-700">Invented questions and answers. Nothing you type is sent.</p>
      <Field label="Browse sample questions" htmlFor="browse-questions">
        <Select
          id="browse-questions"
          value={browse}
          onChange={setBrowse}
          options={[{ value: "all", label: "All sample questions" }, ...model.scopes.map((scope) => ({ value: scope.value, label: scope.label }))]}
        />
      </Field>
      <Card>
        <h3 className="text-base font-semibold">Ask a question</h3>
        <form className="mt-3 grid gap-3" noValidate onSubmit={onAsk}>
          <Field label="Topic" htmlFor="ask-topic">
            <Select
              id="ask-topic"
              value={topic}
              onChange={setTopic}
              options={model.scopes.map((scope) => ({ value: scope.value, label: scope.label }))}
            />
          </Field>
          <Field label="Question title" htmlFor="ask-title">
            <TextInput id="ask-title" value={title} maxLength={140} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Details" htmlFor="ask-details" hint="Kept on this screen only.">
            <Textarea id="ask-details" value={details} maxLength={800} onChange={(event) => setDetails(event.target.value)} />
          </Field>
          {askError ? <ErrorNote>{askError}</ErrorNote> : null}
          {notices.ask ? (
            <p role="status" className="text-sm text-neutral-700">
              {notices.ask}
            </p>
          ) : null}
          <Button type="submit" className="w-full sm:w-auto">
            Add to this screen
          </Button>
        </form>
      </Card>
      {visible.length === 0 ? <p className="text-neutral-800">No sample questions for this filter.</p> : null}
      <ul className="grid gap-3">
        {visible.map((question) => (
          <li key={question.id}>
            <QuestionCard
              question={question}
              helpfulIds={helpfulIds}
              notices={notices}
              answerDraft={answerDrafts[question.id] ?? ""}
              answerError={answerErrors[question.id]}
              reportReason={reportReasons[question.id] ?? ""}
              reportError={reportErrors[question.id]}
              onHelpful={(targetId) => {
                const result = toggleHelpful(helpfulIds, targetId);
                setHelpfulIds(result.ids);
                putNotice(`helpful:${targetId}`, result.notice);
              }}
              onAnswerDraft={(questionId, value) => setAnswerDrafts((current) => ({ ...current, [questionId]: value }))}
              onAnswer={(questionId, body) => {
                const result = addAnswer(questions, { questionId, body, id: nextId("local-a") });
                if (!result.ok) {
                  setAnswerErrors((current) => ({ ...current, [questionId]: result.error }));
                  return;
                }
                setAnswerErrors((current) => ({ ...current, [questionId]: "" }));
                setQuestions(result.questions);
                setAnswerDrafts((current) => ({ ...current, [questionId]: "" }));
                putNotice(`answer:${questionId}`, result.notice);
              }}
              onReportReason={(questionId, value) => setReportReasons((current) => ({ ...current, [questionId]: value }))}
              onReport={(questionId, questionTitle, reasonValue) => {
                const result = noteReport(reports, {
                  id: nextId("local-r"),
                  targetLabel: questionTitle,
                  reasonValue,
                });
                if (!result.ok) {
                  setReportErrors((current) => ({ ...current, [questionId]: result.error }));
                  return;
                }
                setReportErrors((current) => ({ ...current, [questionId]: "" }));
                setReports(result.reports);
                putNotice(`report:${questionId}`, result.notice);
              }}
            />
          </li>
        ))}
      </ul>
      <Card>
        <h4 className="text-base font-semibold">{DEMO_FOUNDER_LABEL}</h4>
        <PrototypeNote />
        <p className="mt-2 text-neutral-700">
          Demonstration founder actions. These controls change labels on this screen only.
        </p>
        {reports.length === 0 ? <p className="mt-3 text-neutral-800">No sample reports on this screen.</p> : null}
        <ul className="mt-3 grid gap-4">
          {reports.map((report) => (
            <li key={report.id} className="grid gap-2 border-t border-neutral-200 pt-3">
              <p className="break-words font-medium text-neutral-900">{report.targetLabel}</p>
              <p className="text-sm text-neutral-600">Reason: {report.reason}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const result = markPreview(reports, report.id, "hidden_on_screen");
                    if (!result.ok) return;
                    setReports(result.reports);
                    putNotice(`preview:${report.id}`, result.notice);
                  }}
                >
                  Preview hide
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const result = markPreview(reports, report.id, "left_visible_on_screen");
                    if (!result.ok) return;
                    setReports(result.reports);
                    putNotice(`preview:${report.id}`, result.notice);
                  }}
                >
                  Preview leave visible
                </Button>
              </div>
              {report.preview === "hidden_on_screen" ? <p className="text-sm text-neutral-800">{PREVIEW_HIDDEN_LABEL}</p> : null}
              {report.preview === "left_visible_on_screen" ? (
                <p className="text-sm text-neutral-800">{PREVIEW_VISIBLE_LABEL}</p>
              ) : null}
              {notices[`preview:${report.id}`] ? (
                <p role="status" className="text-sm text-neutral-700">
                  {notices[`preview:${report.id}`]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-neutral-600">{PREVIEW_ONLY}</p>
      </Card>
    </section>
  );
}

function CompaniesSection({ model }: { model: ExploreModel }) {
  const [role, setRole] = useState("all");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [notices, setNotices] = useState<Record<string, string>>({});
  const shown = companiesForRole(model.companies, role);
  const emptyMessage =
    shown.length > 0
      ? null
      : model.companies.length === 0 || role === "all"
        ? "No company information is on file for this view."
        : "No sample companies for this role category.";

  return (
    <section id="companies" aria-labelledby="companies-heading" className="scroll-mt-6 grid gap-3">
      <h2 id="companies-heading" className="text-lg font-semibold">
        Companies & opportunities
      </h2>
      <p className="text-neutral-700">
        Official careers pages in this directory. This screen does not list positions. Student experiences on these cards are none yet.
      </p>
      <Field label="Role category" htmlFor="company-role">
        <Select
          id="company-role"
          value={role}
          onChange={setRole}
          options={[
            { value: "all", label: "All role categories" },
            ...model.companyRoles.map((item) => ({ value: item, label: item })),
          ]}
        />
      </Field>
      {emptyMessage ? <p className="text-neutral-800">{emptyMessage}</p> : null}
      <ul className="grid gap-3">
        {shown.map((company) => (
          <li key={company.id}>
            <CompanyCard
              company={company}
              saved={savedIds.includes(company.id)}
              notice={notices[company.id]}
              onSave={() => {
                const result = toggleSaved(savedIds, company.id);
                setSavedIds(result.ids);
                setNotices((current) => ({ ...current, [company.id]: result.notice }));
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CompanyCard({
  company,
  saved,
  notice,
  onSave,
}: {
  company: CompanyCardModel;
  saved: boolean;
  notice: string | undefined;
  onSave: () => void;
}) {
  return (
    <Card>
      <h3 className="break-words text-base font-semibold">{company.name}</h3>
      <p className="text-sm text-neutral-600">{company.field}</p>
      <p className="mt-2 text-neutral-800">
        {company.roleCategories.length > 0
          ? `Role categories: ${company.roleCategories.join(", ")}`
          : "No role category is on file."}
      </p>
      <h4 className="mt-3 text-sm font-medium text-neutral-900">Why this company is shown</h4>
      <p className="break-words text-neutral-800">{company.whyShown}</p>
      {company.nearby ? <p className="mt-1 break-words font-medium text-emerald-800">{company.nearby}</p> : null}
      <h4 className="mt-3 text-sm font-medium text-neutral-900">Student experiences</h4>
      <p className="text-neutral-800">{DIRECTORY_EXPERIENCE_LINE}</p>
      <h4 className="mt-3 text-sm font-medium text-neutral-900">Official careers page</h4>
      <OfficialCareersLink url={company.careersUrl} checkedOn={company.linkCheckedOn} />
      <div className="mt-3 grid gap-1">
        <Button
          type="button"
          variant={saved ? "primary" : "secondary"}
          className="w-full sm:w-auto"
          aria-pressed={saved}
          aria-label={saved ? `Saved ${company.name} on this screen, prototype` : `Save opportunity for ${company.name}, prototype`}
          onClick={onSave}
        >
          {saved ? SAVED_LABEL : SAVE_LABEL}
        </Button>
        <p className="text-sm text-neutral-600">{BOOKMARK_HINT}</p>
        {notice ? (
          <p role="status" className="text-sm text-neutral-700">
            {notice}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function BackToDirection() {
  return (
    <div>
      <Button href={ROUTES.direction} variant="secondary" className="w-full sm:w-auto">
        Back to Direction
      </Button>
    </div>
  );
}

export function CareerExplore({ model, phase }: { model: ExploreModel; phase: "loading" | "ready" }) {
  if (phase === "loading") {
    return (
      <div className="grid gap-4">
        <p role="status">Loading exploration…</p>
        <BackToDirection />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <SectionNav />
      <DirectionSection model={model} />
      <PathsSection model={model} />
      <CompaniesSection model={model} />
      <section
        id="demo-preview"
        aria-labelledby="demo-preview-heading"
        className="scroll-mt-6 grid gap-4 rounded-xl border-2 border-neutral-900 bg-neutral-100 p-4"
      >
        <h2 id="demo-preview-heading" className="text-lg font-semibold">
          {DEMO_PREVIEW_LABEL}
        </h2>
        <p className="text-neutral-800">{DEMO_PREVIEW_NOTE}</p>
        <PrototypeNote />
        <ExperiencesSection model={model} />
        <CommunitySection model={model} />
      </section>
      <BackToDirection />
    </div>
  );
}
