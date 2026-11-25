import { sql } from "drizzle-orm";

/** A text[] literal from bound parameters; drizzle would otherwise expand a JS array into a list. */
export function textArraySql(values: readonly string[]) {
  if (values.length === 0) return sql`'{}'::text[]`;
  return sql`array[${sql.join(values.map((value) => sql`${value}`), sql`, `)}]::text[]`;
}
