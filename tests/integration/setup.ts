/**
 * Integration test setup — mocks Supabase client so integration tests
 * run without a live database connection. Provides an in-memory store
 * that supports the full Supabase chaining API used across these tests.
 */
import { vi, beforeEach } from 'vitest';

// --- In-memory store -------------------------------------------------------

const store: Record<string, Record<string, unknown>[]> = {};
let _counter = 0;

const nextId = () =>
  `00000000-0000-0000-0000-${String(++_counter).padStart(12, '0')}`;

function reset() {
  Object.keys(store).forEach((k) => {
    store[k] = [];
  });
  _counter = 0;
}

// --- Query builder ---------------------------------------------------------

function createBuilder(table: string) {
  if (!store[table]) store[table] = [];

  let _insert: Record<string, unknown> | null = null;
  let _update: Record<string, unknown> | null = null;
  let _filters: Record<string, unknown> = {};
  let _isDelete = false;

  const resolveOne = (): { data: Record<string, unknown> | null; error: null } => {
    if (_insert) {
      const record: Record<string, unknown> = {
        id: nextId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ..._insert,
      };
      store[table].push(record);
      return { data: record, error: null };
    }

    if (_update) {
      const idx = store[table].findIndex((r) =>
        Object.entries(_filters).every(([k, v]) => r[k] === v)
      );
      if (idx >= 0) {
        store[table][idx] = {
          ...store[table][idx],
          ..._update,
          updated_at: new Date().toISOString(),
        };
        return { data: store[table][idx], error: null };
      }
      return { data: null, error: null };
    }

    if (_isDelete) {
      store[table] = store[table].filter(
        (r) => !Object.entries(_filters).every(([k, v]) => r[k] === v)
      );
      return { data: null, error: null };
    }

    // SELECT single
    const row =
      store[table].find((r) =>
        Object.entries(_filters).every(([k, v]) => r[k] === v)
      ) ?? null;
    return { data: row, error: null };
  };

  const resolveMany = (): { data: Record<string, unknown>[]; error: null } => {
    if (_isDelete) {
      store[table] = store[table].filter(
        (r) => !Object.entries(_filters).every(([k, v]) => r[k] === v)
      );
      return { data: [], error: null };
    }
    const rows = Object.keys(_filters).length
      ? store[table].filter((r) =>
          Object.entries(_filters).every(([k, v]) => r[k] === v)
        )
      : [...store[table]];
    return { data: rows, error: null };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    insert: (data: Record<string, unknown>) => {
      _insert = data;
      return builder;
    },
    update: (data: Record<string, unknown>) => {
      _update = data;
      return builder;
    },
    delete: () => {
      _isDelete = true;
      return builder;
    },
    select: (_cols?: string) => builder,
    eq: (col: string, val: unknown) => {
      _filters[col] = val;
      return builder;
    },
    order: (_col?: string, _opts?: unknown) => builder,
    limit: (_n?: number) => builder,
    single: () => Promise.resolve(resolveOne()),
    maybeSingle: () => Promise.resolve(resolveOne()),
    // Allow `await supabase.from(...).select(...)` (no .single())
    then: (
      resolve: (v: ReturnType<typeof resolveMany>) => unknown,
      reject?: (e: unknown) => unknown
    ) => Promise.resolve(resolveMany()).then(resolve, reject),
  };

  return builder;
}

// --- Mock ------------------------------------------------------------------

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => createBuilder(table),
    channel: (_name: string) => {
      const ch = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      return ch;
    },
    removeChannel: vi.fn().mockResolvedValue(undefined),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: nextId() } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Reset the store between tests to prevent state leakage
beforeEach(() => {
  reset();
});
