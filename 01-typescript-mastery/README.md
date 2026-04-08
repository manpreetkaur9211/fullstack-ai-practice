# TypeScript Mastery

## Exercises in this folder

| File | Topic | Interview Frequency | Estimated Time |
|------|-------|-------------------|----------------|
| `01-generics.ts` | Generics, type parameters, constraints | ⭐⭐⭐⭐⭐ | 90 min |
| `02-utility-types.ts` | Partial, Pick, Omit, Record, ReturnType + custom | ⭐⭐⭐⭐⭐ | 90 min |
| `03-discriminated-unions.ts` | Discriminated unions, type narrowing, state machines | ⭐⭐⭐⭐ | 90 min |
| `04-advanced-patterns.ts` | Mapped types, conditional types, template literals | ⭐⭐⭐ | 120 min |

## Learning Order

Do them in order. Each builds on the previous.

## How to Run

```bash
# From the repo root
npx ts-node 01-typescript-mastery/01-generics.ts

# Type-check all files without running
npx tsc --noEmit
```

## Interview Question Map

| If asked... | Study this |
|-------------|-----------|
| "Write a generic function that..." | `01-generics.ts` |
| "How do you type API responses?" | `01-generics.ts` Challenge 2 |
| "What's the difference between Pick and Omit?" | `02-utility-types.ts` |
| "How do you model loading state in TypeScript?" | `03-discriminated-unions.ts` |
| "Show me a Redux reducer with types" | `03-discriminated-unions.ts` |
| "What are mapped types?" | `04-advanced-patterns.ts` |
| "Build a type-safe query builder" | `04-advanced-patterns.ts` Challenge 4 |

## Quick Reference

```typescript
// Most used patterns in senior codebases:

// 1. API response wrapper
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

// 2. Loading state
type LoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string }

// 3. Safe partial update
type UpdatePayload<T, K extends keyof T = keyof T> = Pick<Partial<T>, K> & Pick<T, "id">

// 4. Type-safe event system
type Handler<T extends Record<string, unknown>, K extends keyof T> = (payload: T[K]) => void
```
