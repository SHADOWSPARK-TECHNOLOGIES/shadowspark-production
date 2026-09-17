---
name: current-docs
description: Runtime engine and installed versions detection, official documentation lookup procedure, and preventing version-sensitive hallucinations.
version: 1.0.0
tags:
  - documentation
  - runtime
  - versions
  - dependencies
  - node24
  - next16
  - react19
  - nextauth5
  - prisma7
  - zod4
---

# Current Documentation & Version Detection Skill

## 1. Overview & Quick Reference

Modern web frameworks undergo rapid evolution. Relying on outdated model training data or guessing API options leads to subtle runtime bugs, configuration failures, and broken builds. This skill establishes the protocol for detecting the exact installed software versions in the repository, reading authoritative type definitions directly from `node_modules`, and consulting official documentation.

### Exact Installed Repository Stack Reference

| Technology | Installed / Configured Version | Key Invariant & Architectural Signature |
|:---|:---|:---|
| **Node.js** | `24.x` (`engines.node: "24.x"`) | Modern Node 24 runtime; native fetch, crypto, and ES module support. |
| **Next.js** | `16.3.4` | App Router; async `params` and `searchParams`; Webpack & Turbopack support (`next build --webpack`). |
| **React** | `19.2.4` | React 19 Server Components; React Compiler compatibility; `ref` passed as normal prop. |
| **NextAuth (Auth.js)** | `5.0.0-beta.30` | Auth.js v5; universal `auth()` session getter; Route Handler `{ handlers: { GET, POST } }`. **Never** use v4 `getServerSession`. |
| **Prisma** | `7.7.0` | Prisma v7; PostgreSQL driver adapter `@prisma/adapter-pg`; exact precision via `Prisma.Decimal`. |
| **Zod** | `4.3.6` | Zod v4; strict runtime validation schemas; `.safeParse()` pattern; explicit schema inference. |

---

## 2. Core Rules & Invariants

1. **Zero Hallucination of Flags & APIs**:
   - Never extrapolate configuration keys, CLI flags, or function signatures from memory without empirical verification.
   - If unsure whether an option exists in Next.js 16 or NextAuth v5, inspect the TypeScript `.d.ts` declaration file in `node_modules` or search current official documentation.

2. **Types as Ground Truth**:
   - The TypeScript definition files located in `node_modules/<package>/` are the local, frozen source of truth for all API parameters, return types, and exports.

3. **Runtime Engine Discipline**:
   - All build and test commands run under the Node 24 runtime as declared in `package.json:engines`. Do not introduce language constructs or dependencies incompatible with Node 24.

---

## 3. Step-by-Step Operating Procedure

### Step 1: Detect and Record Installed Versions
Before implementing or modifying code that interacts with framework APIs, verify package versions:

```bash
# 1. Read package.json engines and dependencies
node -e "const p = require('./package.json'); console.log({ engines: p.engines, next: p.devDependencies?.next, react: p.dependencies?.react, nextAuth: p.dependencies?.['next-auth'], prisma: p.dependencies?.['@prisma/client'], zod: p.dependencies?.zod });"

# 2. Check active Node runtime
node -v

# 3. Check installed package lockfile for resolved transitive versions
grep -A 4 '"name": "next"' package-lock.json | head -n 5
```

### Step 2: Inspect Local TypeScript Definitions for Ground Truth
When implementing or verifying a method signature, inspect the package's `.d.ts` files directly:

- **NextAuth v5 (Auth.js)**:
  Inspect exports and session typing:
  ```bash
  # Check NextAuth entry types
  cat node_modules/next-auth/index.d.ts
  ```
- **Prisma v7**:
  Inspect client and model types:
  ```bash
  # Check Prisma Client types
  ls -la node_modules/@prisma/client/
  ```
- **Zod v4**:
  Inspect schema parsers:
  ```bash
  # Check Zod exports
  grep -rn "export declare" node_modules/zod/lib/
  ```

### Step 3: Consult Official Documentation
When an API feature requires architectural guidance beyond type definitions:
1. Use targeted web searches targeting official documentation domains:
   - Next.js: `nextjs.org/docs`
   - React: `react.dev`
   - Auth.js: `authjs.dev`
   - Prisma: `prisma.io/docs`
   - Zod: `zod.dev`
2. Formulate focused queries including the major version number (e.g. `"NextAuth v5 beta route handler"`, `"Next.js 16 async params App Router"`).
3. Do not trust random blog posts or outdated forum answers from older major versions.

---

## 4. Key Version-Specific Architectural Patterns for ShadowSpark

### Next.js 16.3.4 & React 19.2.4
- **Async Route Parameters**: In Next.js App Router, dynamic route params are Promises. In route handlers or server components, always `await params`:
  ```typescript
  // App Router Route Handler: src/app/api/.../route.ts
  export async function GET(
    request: Request,
    context: { params: Promise<{ briefId: string }> }
  ) {
    const { briefId } = await context.params;
    // ...
  }
  ```
- **Server Components by Default**: Components under `src/app/` are React Server Components unless marked with `'use client'`. Interactivity, hooks (`useState`, `useEffect`), and browser events require `'use client'`.
- **Webpack Build Flag**: In `package.json`, Next.js build scripts use `--webpack` (`next build --webpack`). Do not strip or alter this flag.

### NextAuth 5.0.0-beta.30 (Auth.js)
- **Universal `auth()` Getter**:
  ```typescript
  import { auth } from "@/auth";

  // In Server Components, Route Handlers, or Server Actions:
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```
- **Route Handler Wiring**:
  ```typescript
  // src/app/api/auth/[...nextauth]/route.ts
  import { handlers } from "@/auth";
  export const { GET, POST } = handlers;
  ```
- **Prohibited NextAuth v4 Anti-Patterns**:
  - ❌ `import { getServerSession } from "next-auth/next"`
  - ❌ `getServerSession(authOptions)`

### Prisma 7.7.0
- **PostgreSQL Driver Adapter**: Uses `@prisma/adapter-pg` with a pooled PostgreSQL client.
- **Prisma `Decimal` for Monetary Amounts**:
  ```typescript
  import { Prisma } from "@prisma/client";
  
  // Persisted money must always use Prisma.Decimal
  const amount = new Prisma.Decimal("1500.50");
  ```
  Never cast monetary values to JavaScript `number` for database writes or balances.

### Zod 4.3.6
- **Strict Parsing**:
  ```typescript
  import { z } from "zod";

  const QuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    state: z.enum(["pending_review", "approved", "rejected"]).optional(),
  });

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }
  ```

---

## 5. Common Pitfalls & Anti-Patterns

- **Hallucinating Deprecated Flags**: Adding `experimental: { serverActions: true }` to `next.config.js` (Server Actions are standard in React 19 / Next.js 16).
- **NextAuth Version Conflation**: Attempting to pass `authOptions` into `auth()` in NextAuth v5.
- **Float Rounding in Fintech**: Computing interest, fees, or review thresholds with standard JavaScript `+` or `*` on floats, introducing rounding errors into Prisma fields.
- **Synchronous `params` Access**: Accessing `context.params.id` directly in Next.js 16 without `await`, resulting in runtime promises or hydration mismatches.

---

## 6. Self-Verification Checklist

Before submitting changes dependent on external libraries:
- [ ] Confirmed installed library version in `package.json`.
- [ ] Verified API signatures against local `.d.ts` declaration files.
- [ ] Ensured no deprecated or removed configuration flags were introduced.
- [ ] Executed type check (`npm run typecheck`) to guarantee compiler validation.
