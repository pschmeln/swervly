import { unstable_rethrow } from "next/navigation";
import type { ZodType } from "zod";
import { captureFailure } from "@/lib/sentry";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function ok<T>(data: T): Response {
  return Response.json({ ok: true, data });
}

type RouteContext = {
  params: Promise<Record<string, string | string[]>>;
};

export function handle(
  fn: (req: Request, ctx: RouteContext) => Promise<Response>,
): (req: Request, ctx: RouteContext) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (error) {
      unstable_rethrow(error);
      if (error instanceof ApiError) {
        if (error.status >= 500) {
          captureFailure(error.code, String(error.status), { error, status: error.status });
        }
        return Response.json(
          {
            ok: false,
            error: {
              code: error.code,
              message: error.message,
              ...(error.fields ? { fields: error.fields } : {}),
            },
          },
          { status: error.status },
        );
      }
      const thrown = error instanceof Error ? error.name : typeof error;
      console.error("api_error", thrown);
      captureFailure("api_error", thrown, { error, status: 500 });
      return Response.json(
        {
          ok: false,
          error: { code: "internal_error", message: "Something went wrong." },
        },
        { status: 500 },
      );
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "invalid_body", "Request body must be JSON.");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.map((part) => String(part)).join(".") || "body";
      if (!fields[key]) fields[key] = issue.message;
    }
    throw new ApiError(400, "invalid_body", "Check the fields below and try again.", fields);
  }

  return parsed.data;
}
