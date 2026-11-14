import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type SqlClient = NeonQueryFunction<false, false>;

let cachedClient: SqlClient | undefined;

function getClient(): SqlClient {
  if (cachedClient) return cachedClient;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  cachedClient = neon(databaseUrl);
  return cachedClient;
}

// Drizzle reads `client.query` while constructing the client. Defer the
// DATABASE_URL check until a query actually runs so `next build` can collect
// pages before Vercel has the variable.
const client = new Proxy((() => undefined) as unknown as SqlClient, {
  apply(_target, _thisArg, args) {
    const real = getClient();
    return Reflect.apply(real, real, args);
  },
  get(_target, prop, receiver) {
    if (prop === "query" || prop === "transaction" || prop === "unsafe") {
      return (...args: unknown[]) => {
        const real = getClient();
        const method = real[prop as "query" | "transaction" | "unsafe"];
        return Reflect.apply(method, real, args);
      };
    }
    const value = Reflect.get(_target, prop, receiver);
    return typeof value === "function" ? value.bind(_target) : value;
  },
});

export const db = drizzle({ client, schema });
