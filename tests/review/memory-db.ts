import {
  Column,
  getTableColumns,
  getTableName,
  is,
  Param,
  SQL,
  StringChunk,
  Table,
} from "drizzle-orm";

/**
 * In-memory stand-in for the Drizzle client. It applies the WHERE, JOIN, and
 * ORDER BY clauses the handlers build, so a missing userId filter shows up as
 * a real read or write instead of a stubbed 404.
 *
 * Deleting a rotation also removes its review, matching reviews.rotation_id
 * ON DELETE CASCADE.
 */

type MemoryRow = Record<string, unknown>;
type MemoryTable = "users" | "employers" | "rotations" | "reviews";
type Scope = Record<string, MemoryRow>;

type Part =
  | { type: "sql"; value: SQL }
  | { type: "op"; text: string }
  | { type: "column"; value: Column }
  | { type: "param"; value: unknown };

type SelectState = {
  fields?: Record<string, unknown>;
  from: string;
  joins: { table: string; on: SQL }[];
  where?: SQL;
  order?: SQL;
  limit?: number;
};

const tables: Record<MemoryTable, MemoryRow[]> = {
  users: [],
  employers: [],
  rotations: [],
  reviews: [],
};

function tableRows(name: string): MemoryRow[] {
  if (!isMemoryTable(name)) throw new Error(`Unexpected table ${name}`);
  return tables[name];
}

function isMemoryTable(name: string): name is MemoryTable {
  return name in tables;
}

function executable<T>(run: () => T) {
  return {
    execute: run,
    then: (
      onfulfilled?: (value: T) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => Promise.resolve().then(run).then(onfulfilled, onrejected),
  };
}

function partsOf(expression: SQL): Part[] {
  const parts: Part[] = [];
  for (const chunk of expression.queryChunks) {
    if (is(chunk, SQL)) {
      parts.push({ type: "sql", value: chunk });
      continue;
    }
    if (is(chunk, StringChunk)) {
      const text = chunk.value.join("").trim();
      if (text === "" || text === "(" || text === ")") continue;
      parts.push({ type: "op", text });
      continue;
    }
    if (is(chunk, Column)) {
      parts.push({ type: "column", value: chunk });
      continue;
    }
    if (is(chunk, Param)) {
      parts.push({ type: "param", value: chunk.value });
      continue;
    }
    const name = chunk instanceof Object ? chunk.constructor.name : typeof chunk;
    throw new Error(`Unsupported SQL chunk ${name}`);
  }
  return parts;
}

function fieldKey(column: Column): string {
  for (const [key, candidate] of Object.entries(getTableColumns(column.table))) {
    if (candidate === column) return key;
  }
  throw new Error(`Column ${column.name} is not on its table`);
}

function readColumn(column: Column, scope: Scope): unknown {
  const table = getTableName(column.table);
  const row = scope[table];
  if (!row) throw new Error(`No ${table} row in scope`);
  return row[fieldKey(column)];
}

function evalSql(expression: SQL, scope: Scope): boolean {
  const parts = partsOf(expression);
  if (parts.length === 1 && parts[0]?.type === "sql") {
    return evalSql(parts[0].value, scope);
  }

  const boolOp = parts.find(
    (part) => part.type === "op" && (part.text === "and" || part.text === "or"),
  );
  if (boolOp) {
    const first = parts[0];
    if (first?.type !== "sql") throw new Error("Boolean expression must start with a predicate");
    let acc = evalSql(first.value, scope);
    for (let index = 1; index < parts.length; index += 2) {
      const op = parts[index];
      const rhs = parts[index + 1];
      if (op?.type !== "op" || (op.text !== "and" && op.text !== "or")) {
        throw new Error("Expected and/or between predicates");
      }
      if (rhs?.type !== "sql") throw new Error("Expected a predicate after and/or");
      const next = evalSql(rhs.value, scope);
      acc = op.text === "and" ? acc && next : acc || next;
    }
    return acc;
  }

  const columns = parts.filter((part) => part.type === "column");
  const params = parts.filter((part) => part.type === "param");
  const equals = parts.find((part) => part.type === "op" && part.text === "=");
  if (!equals || columns.length === 0) {
    throw new Error("Unsupported predicate");
  }
  const left = readColumn(columns[0].value, scope);
  const right =
    params.length > 0 ? params[0].value : readColumn(columns[1]?.value as Column, scope);
  return Object.is(left, right);
}

function readOrder(expression: SQL): { table: string; key: string; direction: 1 | -1 } {
  const parts = partsOf(expression);
  if (parts.length === 1 && parts[0]?.type === "sql") return readOrder(parts[0].value);
  const column = parts.find((part) => part.type === "column");
  if (column?.type !== "column") throw new Error("orderBy is missing a column");
  const direction = parts.some((part) => part.type === "op" && part.text === "desc") ? -1 : 1;
  return {
    table: getTableName(column.value.table),
    key: fieldKey(column.value),
    direction,
  };
}

function compare(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "string" && typeof right === "string") {
    if (left === right) return 0;
    return left < right ? -1 : 1;
  }
  throw new Error("Unsupported orderBy value");
}

function project(
  fields: Record<string, unknown> | undefined,
  scope: Scope,
  from: string,
): MemoryRow {
  if (!fields) {
    const row = scope[from];
    if (!row) throw new Error(`Missing ${from} row`);
    return row;
  }

  const projected: MemoryRow = {};
  for (const [key, value] of Object.entries(fields)) {
    if (is(value, Table)) {
      const name = getTableName(value);
      const row = scope[name];
      if (!row) throw new Error(`Missing ${name} row`);
      projected[key] = row;
      continue;
    }
    if (is(value, Column)) {
      projected[key] = readColumn(value, scope);
      continue;
    }
    throw new Error(`Unsupported select field ${key}`);
  }
  return projected;
}

function runSelect(state: SelectState): MemoryRow[] {
  let scopes: Scope[] = tableRows(state.from).map((row) => ({ [state.from]: row }));
  for (const join of state.joins) {
    const next: Scope[] = [];
    for (const scope of scopes) {
      for (const row of tableRows(join.table)) {
        const candidate = { ...scope, [join.table]: row };
        if (evalSql(join.on, candidate)) next.push(candidate);
      }
    }
    scopes = next;
  }
  if (state.where) scopes = scopes.filter((scope) => evalSql(state.where as SQL, scope));
  if (state.order) {
    const order = readOrder(state.order);
    scopes = [...scopes].sort((left, right) => {
      const leftValue = left[order.table]?.[order.key];
      const rightValue = right[order.table]?.[order.key];
      return compare(leftValue, rightValue) * order.direction;
    });
  }
  if (state.limit !== undefined) scopes = scopes.slice(0, state.limit);
  return scopes.map((scope) => project(state.fields, scope, state.from));
}

function select(fields?: Record<string, unknown>) {
  return {
    from(table: Table) {
      const state: SelectState = {
        fields,
        from: getTableName(table),
        joins: [],
      };
      const chain = {
        innerJoin(other: Table, on: SQL) {
          state.joins.push({ table: getTableName(other), on });
          return chain;
        },
        where(expression: SQL) {
          state.where = expression;
          return chain;
        },
        orderBy(expression: SQL) {
          state.order = expression;
          return chain;
        },
        limit(count: number) {
          state.limit = count;
          return chain;
        },
        ...executable(() => runSelect(state)),
      };
      return chain;
    },
  };
}

function update(table: Table) {
  const tableName = getTableName(table);
  return {
    set(values: MemoryRow) {
      return {
        where(expression: SQL) {
          return executable(() => {
            for (const row of tableRows(tableName)) {
              if (evalSql(expression, { [tableName]: row })) Object.assign(row, values);
            }
          });
        },
      };
    },
  };
}

function remove(table: Table) {
  const tableName = getTableName(table);
  return {
    where(expression: SQL) {
      return executable(() => {
        const kept: MemoryRow[] = [];
        const removed: MemoryRow[] = [];
        for (const row of tableRows(tableName)) {
          if (evalSql(expression, { [tableName]: row })) removed.push(row);
          else kept.push(row);
        }
        tables[tableName as MemoryTable] = kept;
        if (tableName === "rotations") {
          const ids = new Set(removed.map((row) => row.id));
          tables.reviews = tables.reviews.filter((review) => !ids.has(review.rotationId));
        }
      });
    },
  };
}

function insert(table: Table) {
  const tableName = getTableName(table);
  return {
    values(value: MemoryRow) {
      const write = (ignoreUnique: boolean) => {
        const rows = tableRows(tableName);
        if (tableName === "users") {
          const clash = rows.some(
            (row) => row.clerkId === value.clerkId || row.email === value.email,
          );
          if (clash) {
            if (ignoreUnique) return;
            throw new Error("users unique violation");
          }
        }
        rows.push({ ...value });
      };
      return {
        ...executable(() => write(false)),
        onConflictDoNothing() {
          const run = () => {
            const before = tableRows(tableName).length;
            write(true);
            if (tableRows(tableName).length === before) return [];
            const row = tableRows(tableName).at(-1);
            return row ? [{ id: row.id }] : [];
          };
          return {
            ...executable(run),
            returning() {
              return executable(run);
            },
          };
        },
      };
    },
  };
}

async function batch(queries: readonly { execute: () => unknown }[]): Promise<unknown[]> {
  const results: unknown[] = [];
  for (const query of queries) results.push(await query.execute());
  return results;
}

export const db = {
  select,
  update,
  delete: remove,
  insert,
  batch,
};

export function resetMemory(): void {
  tables.users = [];
  tables.employers = [];
  tables.rotations = [];
  tables.reviews = [];
}

export function seedMemory(table: MemoryTable, rows: readonly object[]): void {
  const target = tableRows(table);
  for (const row of rows) target.push(structuredClone(row) as MemoryRow);
}

export function memorySnapshot(): { rotations: MemoryRow[]; reviews: MemoryRow[] } {
  return {
    rotations: structuredClone(tables.rotations),
    reviews: structuredClone(tables.reviews),
  };
}

export function memoryUsers(): MemoryRow[] {
  return structuredClone(tables.users);
}
