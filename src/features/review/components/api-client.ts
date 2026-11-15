export type ApiErrorBody = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorBody };

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
