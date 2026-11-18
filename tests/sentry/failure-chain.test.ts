import { NeonDbError } from "@neondatabase/serverless";
import { DrizzleQueryError } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import { describe, expect, it } from "vitest";
import {
  databaseFailureDetail,
  errorChain,
  innermostErrorName,
  isAbortedRender,
  isDatabaseError,
} from "@/lib/failure-chain";

const QUERY = 'select "id", "email" from "users" where "users"."clerk_id" = $1 limit $2';
const PARAMS = ["user_3Mfakeclerkid", 1];

// What Next.js throws from fetch() when it ends a render mid-request.
function hangingPromiseError(): Error {
  const error = new Error(
    'During prerendering, fetch() rejects when the prerender is complete. This occurred at route "/home".',
  );
  Object.assign(error, { digest: "HANGING_PROMISE_REJECTION" });
  return error;
}

// The Neon HTTP driver wraps a failed fetch like this (sourceError, not cause).
function neonConnectError(source: unknown): NeonDbError {
  const error = new NeonDbError(`Error connecting to database: ${String(source)}`);
  error.sourceError = source as Error;
  return error;
}

function drizzle(cause: unknown): DrizzleQueryError {
  return new DrizzleQueryError(QUERY, PARAMS, cause as Error);
}

describe("errorChain", () => {
  it("follows Drizzle's cause and Neon's sourceError", () => {
    const hanging = hangingPromiseError();
    const neon = neonConnectError(hanging);
    const outer = drizzle(neon);
    expect(errorChain(outer)).toEqual([outer, neon, hanging]);
  });

  it("stops on a cycle", () => {
    const a = new Error("a");
    const b = new Error("b", { cause: a });
    Object.assign(a, { cause: b });
    expect(errorChain(b)).toEqual([b, a]);
  });
});

describe("cancelled renders wrapped by the database driver", () => {
  it("is missed by Next's unstable_rethrow (the production bug)", () => {
    const wrapped = drizzle(neonConnectError(hangingPromiseError()));
    expect(() => unstable_rethrow(wrapped)).not.toThrow();
  });

  it("is found by walking the chain", () => {
    const hanging = hangingPromiseError();
    const wrapped = drizzle(neonConnectError(hanging));
    expect(() => {
      for (const item of errorChain(wrapped)) unstable_rethrow(item);
    }).toThrow(hanging);
    expect(isAbortedRender(wrapped)).toBe(true);
  });

  it("does not treat a real connection failure as a cancelled render", () => {
    const wrapped = drizzle(neonConnectError(new TypeError("fetch failed")));
    expect(isAbortedRender(wrapped)).toBe(false);
    expect(isAbortedRender(new Error("connection refused"))).toBe(false);
  });
});

describe("databaseFailureDetail", () => {
  it("returns the SQLSTATE for a Postgres error", () => {
    const neon = new NeonDbError('column "major_source" does not exist');
    neon.code = "42703";
    const error = drizzle(neon);
    expect(isDatabaseError(error)).toBe(true);
    expect(databaseFailureDetail(error)).toBe("pg_42703");
  });

  it("labels a failed connection with the source error name", () => {
    expect(databaseFailureDetail(drizzle(neonConnectError(new TypeError("fetch failed"))))).toBe(
      "connect_TypeError",
    );
  });

  it("never returns the query, its parameters or the driver message", () => {
    const neon = new NeonDbError("student@mail.uc.edu user_3Mfakeclerkid");
    const detail = databaseFailureDetail(drizzle(neon));
    expect(detail).toBe("NeonDbError");
    expect(detail).not.toMatch(/@|user_3M|select/);
  });

  it("does not call a plain error a database error", () => {
    expect(isDatabaseError(new Error("Clerk: network down"))).toBe(false);
  });
});

describe("innermostErrorName", () => {
  it("returns the deepest safe name", () => {
    expect(innermostErrorName(new Error("outer", { cause: new RangeError("inner") }))).toBe("RangeError");
  });

  it("returns unknown when nothing is an Error", () => {
    expect(innermostErrorName("boom")).toBe("unknown");
  });
});
