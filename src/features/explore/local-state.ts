import type {
  FounderPreview,
  FounderReport,
  LocalQuestion,
  ScopeOption,
  CompanyCardModel,
} from "@/features/explore/types";

export const NOT_SENT = "Only on this screen. Nothing was sent.";
export const NOT_SAVED_MARK = "Marked on this screen. Not saved.";
export const MARK_CLEARED = "Cleared on this screen. Not saved.";
export const REPORT_NOTED = "Noted on this screen. Nothing was sent.";
export const PREVIEW_ONLY = "Preview only. Nothing was changed for anyone else.";
export const SAVED_HERE = "Kept on this screen. Not saved.";
export const SAVE_CLEARED = "Removed from this screen. Not saved.";
export const SAVE_LABEL = "Save opportunity (prototype)";
export const SAVED_LABEL = "Saved on this screen (prototype)";
export const BOOKMARK_HINT = "Non-persistent bookmark. Nothing is stored.";
export const HELPFUL_LABEL = "Helpful";
export const HELPFUL_MARKED_LABEL = "Marked helpful on this screen";
export const PREVIEW_HIDDEN_LABEL = "Marked hidden on this screen.";
export const PREVIEW_VISIBLE_LABEL = "Still visible on this screen.";
export const NEED_TITLE = "Add a title to keep it on this screen.";
export const TITLE_TOO_LONG = "Use a shorter title to keep it on this screen.";
export const NEED_DETAILS = "Add details to keep it on this screen.";
export const DETAILS_TOO_LONG = "Use shorter details to keep it on this screen.";
export const NEED_TOPIC = "Choose a topic to keep it on this screen.";
export const NEED_REASON = "Choose a reason to note it on this screen.";
export const MISSING_QUESTION = "That sample question is not on this screen.";
export const MISSING_REPORT = "That sample report is not on this screen.";

export const PROTOTYPE_NOTICES = [
  NOT_SENT,
  NOT_SAVED_MARK,
  MARK_CLEARED,
  REPORT_NOTED,
  PREVIEW_ONLY,
  SAVED_HERE,
  SAVE_CLEARED,
  SAVE_LABEL,
  SAVED_LABEL,
  BOOKMARK_HINT,
  HELPFUL_LABEL,
  HELPFUL_MARKED_LABEL,
  PREVIEW_HIDDEN_LABEL,
  PREVIEW_VISIBLE_LABEL,
  NEED_TITLE,
  TITLE_TOO_LONG,
  NEED_DETAILS,
  DETAILS_TOO_LONG,
  NEED_TOPIC,
  NEED_REASON,
  MISSING_QUESTION,
  MISSING_REPORT,
] as const;

export const FORBIDDEN_PROTOTYPE_CLAIM =
  /\b(submitted|published|moderated|now hiring|open position|open roles?|fit score|currently open)\b|%\s*match/i;

export const REPORT_REASONS = [
  { value: "not-experience", label: "Not a student experience" },
  { value: "private", label: "Private information" },
  { value: "unsafe", label: "Unkind or unsafe" },
] as const;

const TITLE_LIMIT = 140;
const DETAILS_LIMIT = 800;

export function parseScope(
  value: string,
  scopes: readonly ScopeOption[],
): { scopeKind: "role" | "company"; scopeId: string; shortLabel: string } | null {
  const splitAt = value.indexOf(":");
  if (splitAt <= 0) return null;
  const kind = value.slice(0, splitAt);
  const scopeId = value.slice(splitAt + 1);
  if ((kind !== "role" && kind !== "company") || scopeId.length === 0) return null;
  const option = scopes.find((item) => item.value === value);
  if (!option) return null;
  return { scopeKind: kind, scopeId, shortLabel: option.shortLabel };
}

export function filterQuestions(
  questions: readonly LocalQuestion[],
  scopeValue: string,
): LocalQuestion[] {
  if (scopeValue === "all") return [...questions];
  const splitAt = scopeValue.indexOf(":");
  if (splitAt <= 0) return [];
  const kind = scopeValue.slice(0, splitAt);
  const scopeId = scopeValue.slice(splitAt + 1);
  if (kind !== "role" && kind !== "company") return [];
  return questions.filter((question) => question.scopeKind === kind && question.scopeId === scopeId);
}

export function companiesForRole(
  companies: readonly CompanyCardModel[],
  role: string,
): CompanyCardModel[] {
  if (role === "all") return [...companies];
  return companies.filter((company) => company.roleCategories.includes(role));
}

export function addQuestion(
  questions: readonly LocalQuestion[],
  input: { scopeValue: string; title: string; body: string; id: string },
  scopes: readonly ScopeOption[],
): { ok: true; questions: LocalQuestion[]; notice: string } | { ok: false; error: string } {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { ok: false, error: NEED_TITLE };
  if (title.length > TITLE_LIMIT) return { ok: false, error: TITLE_TOO_LONG };
  if (!body) return { ok: false, error: NEED_DETAILS };
  if (body.length > DETAILS_LIMIT) return { ok: false, error: DETAILS_TOO_LONG };
  const scope = parseScope(input.scopeValue, scopes);
  if (!scope) return { ok: false, error: NEED_TOPIC };
  const next: LocalQuestion = {
    id: input.id,
    scopeKind: scope.scopeKind,
    scopeId: scope.scopeId,
    scopeLabel: scope.shortLabel,
    authorLabel: "You, on this screen",
    title,
    body,
    sampleHelpfulCount: 0,
    localOnly: true,
    answers: [],
  };
  return { ok: true, questions: [next, ...questions], notice: NOT_SENT };
}

export function addAnswer(
  questions: readonly LocalQuestion[],
  input: { questionId: string; body: string; id: string },
): { ok: true; questions: LocalQuestion[]; notice: string } | { ok: false; error: string } {
  const body = input.body.trim();
  if (!body) return { ok: false, error: NEED_DETAILS };
  if (body.length > DETAILS_LIMIT) return { ok: false, error: DETAILS_TOO_LONG };
  let found = false;
  const questionsNext = questions.map((question) => {
    if (question.id !== input.questionId) return question;
    found = true;
    return {
      ...question,
      answers: [
        ...question.answers,
        {
          id: input.id,
          authorLabel: "You, on this screen",
          body,
          sampleHelpfulCount: 0,
          localOnly: true,
        },
      ],
    };
  });
  if (!found) return { ok: false, error: MISSING_QUESTION };
  return { ok: true, questions: questionsNext, notice: NOT_SENT };
}

export function toggleHelpful(
  ids: readonly string[],
  targetId: string,
): { ids: string[]; notice: string } {
  if (ids.includes(targetId)) {
    return { ids: ids.filter((id) => id !== targetId), notice: MARK_CLEARED };
  }
  return { ids: [...ids, targetId], notice: NOT_SAVED_MARK };
}

export function toggleSaved(
  ids: readonly string[],
  companyId: string,
): { ids: string[]; notice: string } {
  if (ids.includes(companyId)) {
    return { ids: ids.filter((id) => id !== companyId), notice: SAVE_CLEARED };
  }
  return { ids: [...ids, companyId], notice: SAVED_HERE };
}

export function noteReport(
  reports: readonly FounderReport[],
  input: { id: string; targetLabel: string; reasonValue: string },
): { ok: true; reports: FounderReport[]; notice: string } | { ok: false; error: string } {
  const reason = REPORT_REASONS.find((item) => item.value === input.reasonValue);
  const targetLabel = input.targetLabel.trim();
  if (!reason || !targetLabel) return { ok: false, error: NEED_REASON };
  return {
    ok: true,
    reports: [{ id: input.id, targetLabel, reason: reason.label, preview: null }, ...reports],
    notice: REPORT_NOTED,
  };
}

export function markPreview(
  reports: readonly FounderReport[],
  id: string,
  preview: FounderPreview,
): { ok: true; reports: FounderReport[]; notice: string } | { ok: false; error: string } {
  let found = false;
  const reportsNext = reports.map((report) => {
    if (report.id !== id) return report;
    found = true;
    return { ...report, preview };
  });
  if (!found) return { ok: false, error: MISSING_REPORT };
  return { ok: true, reports: reportsNext, notice: PREVIEW_ONLY };
}
