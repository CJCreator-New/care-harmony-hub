# CareSync HIMS: Deep Modules Architecture

Each domain directory under `src/modules/` is a **deep module**: a substantial amount of clinical/system behaviour hidden behind a small, focused interface.

## Module Layout

Every module follows this layout:

```
src/modules/
  <domain>/
    index.ts        ← Primary public entry point (import this from outside)
    types.ts        ← Optional public type definitions
    client.ts       ← Optional secondary entry point (no barrel files!)
    lib/            ← Private implementation (hidden from external callers)
    adapters/       ← Private infrastructure adapters (Supabase, external APIs)
    tests/          ← Module tests & fixtures
```

## The Four Boundary Rules (Enforced by `dependency-cruiser`)

1. **Entry-point boundary**: Code outside a module (application components, hooks, or other modules) may import **only** that module's root entry points (`src/modules/<name>/index.ts`), never anything inside its private subfolders (`lib/`, `adapters/`, etc.).
2. **Intra-module freedom**: A module's internal files (`lib/`, `adapters/`) import each other freely.
3. **Tests through entry points**: Tests under `<domain>/tests/` exercise the module through its public entry points, never by reaching into internal subfolders.
4. **No circular dependencies**: Dependency cycles are strictly forbidden.

## Avoid Barrel Files

Do not create giant barrel `index.ts` files that re-export an entire internal directory tree. Expose small, clean, intent-revealing entry points (`index.ts`, `types.ts`, `ports.ts`) and keep implementation details private.

## Active Deep Modules

1. **`src/modules/order-safety/`**: Clinical order safety engine, DDI detection, allergy cross-matching, pediatric weight-based dosing bounds, and fail-closed CDS invariants.
2. **`src/modules/discharge-pipeline/`**: Sequential multi-role patient discharge orchestration (Doctor ➔ Pharmacist ➔ Billing ➔ Nurse ➔ Completed), role gating, rollback handling, and audit history per ADR-0003.
3. **`src/modules/example/`**: Minimal reference module illustrating deep module structure and boundary enforcement.

## Running Boundary Validation

```bash
npm run lint:boundaries
```
