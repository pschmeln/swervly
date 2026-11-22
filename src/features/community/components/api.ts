import { readApiJson, type ApiResult } from "@/features/review/components/api-client";

export async function sendCommunity<T>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return await readApiJson<T>(response);
  } catch {
    return { ok: false, error: { code: "network", message: "Could not reach Swervly. Check your connection and try again." } };
  }
}
