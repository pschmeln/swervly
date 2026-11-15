export type ApiFailure = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiFailure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readApiResponse<T>(payload: unknown): ApiResponse<T> | null {
  if (!isRecord(payload) || typeof payload.ok !== "boolean") return null;

  if (payload.ok === true && "data" in payload) {
    return { ok: true, data: payload.data as T };
  }

  if (payload.ok === false && isRecord(payload.error)) {
    const fields: Record<string, string> = {};
    if (isRecord(payload.error.fields)) {
      for (const [key, value] of Object.entries(payload.error.fields)) {
        if (typeof value === "string") fields[key] = value;
      }
    }
    return {
      ok: false,
      error: {
        code: typeof payload.error.code === "string" ? payload.error.code : "error",
        message:
          typeof payload.error.message === "string"
            ? payload.error.message
            : "Something went wrong.",
        ...(Object.keys(fields).length > 0 ? { fields } : {}),
      },
    };
  }

  return null;
}

export async function sendJson<T>(
  url: string,
  method: "PUT" | "POST" | "DELETE",
  body: unknown,
): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: { code: "network", message: "Something went wrong." } };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: { code: "invalid_response", message: "Something went wrong." } };
  }

  return (
    readApiResponse<T>(payload) ?? {
      ok: false,
      error: { code: "invalid_response", message: "Something went wrong." },
    }
  );
}
