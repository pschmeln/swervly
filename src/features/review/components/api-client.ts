export type ApiErrorBody = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorBody };

/**
 * Alert next to Save. Field errors still render on their controls; this text
 * stays so a failure is visible from the button, including a 409 whose field
 * is higher on the form.
 */
export function apiFormBannerMessage(error: ApiErrorBody): string | undefined {
  const message = error.message.trim();
  if (message.length > 0) return message;
  if (!error.fields) return undefined;
  for (const value of Object.values(error.fields)) {
    const fieldMessage = value.trim();
    if (fieldMessage.length > 0) return fieldMessage;
  }
  return undefined;
}

/** Control ids in on-screen order. Server keys are not always element ids. */
const FIELD_CONTROL_IDS: readonly { keys: readonly string[]; id: string }[] = [
  { keys: ["employerId", "name"], id: "employer" },
  { keys: ["roleTitle"], id: "roleTitle" },
  { keys: ["termSeason"], id: "termSeason" },
  { keys: ["termYear"], id: "termYear" },
  { keys: ["rotationNumber"], id: "rotationNumber" },
  { keys: ["payHourly"], id: "payHourly" },
  { keys: ["returnOffer"], id: "returnOffer" },
  { keys: ["enjoyment", "review.enjoyment"], id: "enjoyment-1" },
  { keys: ["learning", "review.learning"], id: "learning-1" },
  { keys: ["mentorship", "review.mentorship"], id: "mentorship-1" },
  { keys: ["clarityGained", "review.clarityGained"], id: "clarityGained-1" },
  { keys: ["skillsUsed", "review.skillsUsed"], id: "skills-used" },
  { keys: ["freeText", "review.freeText"], id: "freeText" },
  { keys: ["shareFreeText", "review.shareFreeText"], id: "shareFreeText" },
];

/** First control to scroll to and focus after a save fails with field errors. */
export function firstFieldControlId(
  fields: Record<string, string> | undefined,
): string | undefined {
  if (!fields) return undefined;
  for (const entry of FIELD_CONTROL_IDS) {
    for (const key of entry.keys) {
      const message = fields[key];
      if (typeof message === "string" && message.trim().length > 0) {
        return entry.id;
      }
    }
  }
  return undefined;
}

export async function readApiJson<T>(response: Response): Promise<ApiResult<T>> {
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      ok: false,
      error: { code: "invalid_response", message: "Something went wrong." },
    };
  }

  if (
    json &&
    typeof json === "object" &&
    "ok" in json &&
    (json as { ok: unknown }).ok === true &&
    "data" in json
  ) {
    return { ok: true, data: (json as { data: T }).data };
  }

  if (
    json &&
    typeof json === "object" &&
    "ok" in json &&
    (json as { ok: unknown }).ok === false &&
    "error" in json
  ) {
    const error = (json as { error: ApiErrorBody }).error;
    return {
      ok: false,
      error: {
        code: error?.code ?? "unknown_error",
        message: error?.message ?? "Something went wrong.",
        fields: error?.fields,
      },
    };
  }

  return {
    ok: false,
    error: { code: "invalid_response", message: "Something went wrong." },
  };
}
