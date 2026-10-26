# LLM Rules for Chitchatter Project

## The `src/core` Boundary

Chitchatter's chat logic lives in `src/core`, decoupled from the React app that presents it, so that it can also run in Node or a terminal. **Read [`src/core/README.md`](./src/core/README.md) before changing anything under `src/core`.**

The rule that matters most: **nothing under `src/core` may depend on React or on a browser.** Concretely, no file under `src/core` may:

- import `react`, `react-*`, `@mui/*` or `@emotion/*`
- import from `components/`, `contexts/`, `pages/`, `hooks/`, `services/` or `adapters/`
- import a browser-only package (`localforage`, `file-saver`, `streamsaver`, `secure-file-transfer`)
- touch `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `alert`, `Notification` or `AudioContext`
- read `import.meta.env` — build-time configuration is passed in, not read

ESLint enforces the first four through the `src/core/**/*.ts` override in `.eslintrc.json`, so `npm run lint` fails on a violation. Lint cannot see through a transitive import that itself reaches for the DOM, so the real backstop is the `core` Vitest project, which runs in a Node environment with no setup files:

```sh
npx vitest run --project core
```

**Run that command after any change under `src/core`**, in addition to `npm test`. A change that passes the `web` project but fails `core` has broken the boundary.

When the core needs a platform capability — notifications, sound, storage, file transfer, the current time, a UUID, logging — add it to the adapter interfaces in `src/core/adapters/types.ts` and implement it in `src/adapters/web/` and `src/core/adapters/noop.ts`. Never reach for the browser API directly.

Audio, video and screen share are intentionally outside the core and belong in `src/components/Room/`. The core may track _that_ a peer's media is playing, but must never handle a `MediaStream`.

## Type Safety Is a Core Goal

**Type safety and strictness are core technical goals of this project, not a
code-quality checkbox.** The compiler is the primary correctness tool here: this
is a peer-to-peer app with no server to validate anything, where every message
arrives from an untrusted peer and a wrong shape surfaces as a broken
conversation rather than a stack trace. Treat `tsc` as the thing that has to
catch mistakes, because there is nothing behind it.

The standard to hold: **a type that permits a wrong program is a bug, even when
no wrong program exists yet.** "Every caller happens to pass the right thing" is
not type safety — it is a convention waiting to be broken by the next caller.

### Enforced today

`npm run check:types` runs `tsc` over two projects (the app and `scripts/`) and
must report zero errors. `tsconfig.json` has `strict: true` — which brings
`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`,
`strictPropertyInitialization` and `useUnknownInCatchVariables` — plus
`noFallthroughCasesInSwitch`, `noImplicitReturns`, `noImplicitOverride`,
`noPropertyAccessFromIndexSignature`, `noUnusedLocals` and
`noUnusedParameters`.

**Do not weaken any of these.** If a change needs a flag relaxed, the change is
wrong.

### Flags not yet on

Ratcheting strictness up is welcome and tracked. Measured error counts as of
this writing, so you know what you are signing up for:

| Flag                         | Errors if enabled | Notes                                                                |
| ---------------------------- | ----------------- | -------------------------------------------------------------------- |
| `noUncheckedIndexedAccess`   | 55                | 16 production (3 in `src/core`), 39 in tests. The highest-value one. |
| `exactOptionalPropertyTypes` | 24                | Mostly MUI props. Lowest priority.                                   |

Re-measure before quoting these — `npx tsc --noEmit --<flag>` — rather than
trusting the table.

### Rules

- **No `any`.** Not explicit, not implicit, not smuggled in. Data of unknown
  shape is `unknown`, narrowed by a guard. If a dependency's types force `any`
  at the boundary, confine it to the smallest possible expression and do not let
  it escape into code you control.
- **Never write `extends Record<string, any>` on a model.** It does far more
  damage than it looks like: an index signature makes `keyof T` equal
  `string | number`, so `Omit<T, K>` and `Pick<T, K>` **silently erase every
  named property**. An interface built that way accepts an object missing all of
  its required fields, accepts wrong types for the ones it declares, and returns
  `any` for a misspelled property read. Plain `type` aliases get an implicit
  index signature and satisfy a `Record`-shaped constraint without any of this,
  so prefer them for wire payloads.
- **Validate at the boundary, and validate honestly.** Anything from a peer,
  from storage, from `JSON.parse` or from `fetch` enters as `unknown` and gets
  narrowed by a validator before it is used. A type predicate (`x is Y`) must
  actually establish `Y`: check every field it claims, including array elements
  and optional properties when present. A validator that claims more than it
  checks is worse than none, because it launders bad data into a trusted type.
- **Assertions are a last resort.** `as X`, `as unknown as X` and `!` each need
  a comment stating why the assertion is sound and what guarantees it. Prefer a
  type guard, a discriminated union, or changing the signature. `as unknown as`
  in particular means two types are unrelated — ask why you are bridging them.
- **Return `readonly`.** A getter that hands out internal state hands out a
  mutation path. Snapshot accessors return `readonly T[]` / `Readonly<T>`, both
  so callers cannot corrupt core state and so a mutation cannot bypass the event
  that subscribers depend on.
- **Bind related types together.** When two things must agree — an event name
  and its payload, an action and its wire shape — encode the mapping as a type
  (`Record`-style map keyed by the enum) and derive both ends from it. Do not
  let each call site pick its own generic argument and hope they match.
- **Keep parameters as narrow as the operation.** `Partial<Peer>` on a method
  that only sets media state invites writes to identity fields. Use
  `Partial<Pick<Peer, …>>`.
- **Do not fake types in tests.** `{…} as unknown as SomeClass` compiles forever
  and stops protecting the moment the real class grows a method the stub lacks.
  Prefer the real thing — the core is headless and `InMemoryTransport` plus
  `createPlatformAdapters` give you a working `ChatRoom` in a Node test — or
  depend on `Pick<ChatRoom, 'getPeers' | 'on'>` so the compiler checks the stub.
  Spread a real default (e.g. the context's own default value) rather than
  casting a partial object to the context type.

See also **Enums for Bounded Values** below, which is the same principle applied
to values rather than shapes.

## TypeScript Function Definitions

When writing TypeScript functions in this project, always use the arrow function assignment form:

```typescript
const functionName = () => {
  // function body
}
```

Instead of:

- Function declarations: `function functionName() {}`
- Function expressions: `const functionName = function() {}`

This applies to:

- Regular functions
- Async functions: `const functionName = async () => {}`
- Functions with parameters: `const functionName = (param1: string, param2: number) => {}`
- Functions with return types: `const functionName = (): ReturnType => {}`

## Exceptions

The only exceptions to this rule are:

- React component definitions (use function declarations or arrow functions as appropriate)
- Method definitions within classes
- Callback functions that are defined inline

## Rationale

This consistent style improves code readability and maintains uniformity across the codebase.

## Enums for Bounded Values

**Whenever a value can only ever be one of a set known at build time, model it
as a TypeScript `enum`** — not a bare `string`, not a `number`, and not a string
literal union. Bias towards an enum whenever you catch yourself writing the same
literal in two places, or typing a parameter `string` when only a handful of
words are valid.

```typescript
export enum ChatRoomErrorContext {
  SEND_MESSAGE = 'sendMessage',
  GREET_PEER = 'greetPeer',
}

const reportError = (error: unknown, context: ChatRoomErrorContext) => {}
```

Instead of:

```typescript
const reportError = (error: unknown, context: string) => {}
```

Applies to: event and error identifiers, protocol and action names, state
machine states, modes and variants, adapter and transport keys, and anything
else a consumer might reasonably want to `switch` on. `PeerHookType`,
`ActionNamespace`, `PeerAction`, `ChatRoomEvent`, `ColorMode`, `AudioState` and
`RoomNameType` are existing examples to follow.

A parameter typed `string` where an enum exists is a bug even when every caller
happens to pass the enum: propagate the enum through the signature — including
the interfaces in `src/core/transport/types.ts` and `src/core/adapters/types.ts`
and the React hooks that wrap them — so the compiler, not a reviewer, is what
keeps them honest.

Conventions:

- `SCREAMING_SNAKE_CASE` members.
- Give string values when the value is serialized, logged or compared against
  the wire; they make a transcript or a log line readable. Omit them only for
  purely internal ordinals.
- Declare the enum next to the contract it belongs to (the event payload map,
  the model, the transport types), and export it so hosts can switch on it.

### Exceptions

- Values that come from outside this codebase keep their upstream type — a
  third-party library's own union (MUI's `AlertProps['severity']`), a Web
  platform constant (`'spki'`, `'candidate-pair'`), or a runtime-derived string
  such as a URL or a peer id. Do not invent a parallel enum for those.
- A single well-named constant (`userSettingsStorageKey`) does not need an enum
  to hold one member.

### Rationale

An enum gives the set a name, a single place to change it, exhaustiveness
checking in a `switch`, and autocomplete at every call site. A `string` gives a
typo that type-checks.

## Code Quality Requirements

### Testing

- **All new features must include comprehensive test coverage**
- **All bug fixes must include regression tests**
- Tests must be written using the project's testing framework (Vitest)
- Run tests with: `npm test`
- Tests must pass before any code is committed
- Aim for meaningful test cases that cover edge cases and error conditions
- Use descriptive test names that explain what is being tested
- Mock external dependencies appropriately

### Linting and Formatting

- **All code must pass ESLint with zero warnings**
- Run linting with: `npm run lint`
- **All code must be formatted with Prettier**
- Run formatting with: `npm run prettier`
- Fix all linting issues before committing code
- Use ESLint disable comments sparingly and only when absolutely necessary
- Always include a comment explaining why ESLint is being disabled

### Type Safety

- **All TypeScript code must pass type checking with zero errors**
- Run type checking with: `npm run check:types` (it covers both `tsc` projects)
- Use explicit type annotations for function parameters and return types
- Never use `any`; use `unknown` and narrow it

See **Type Safety Is a Core Goal** above for the full rules — what to do at
trust boundaries, why `extends Record<string, any>` is forbidden, how to handle
assertions, and the strictness flags. That section governs; this list is a
reminder of the mechanics.

### Code Quality Best Practices

- **Write self-documenting code with clear variable and function names**
- Add JSDoc comments for public APIs and complex functions
- Keep functions small and focused on a single responsibility
- Use consistent naming conventions throughout the codebase
- Handle errors gracefully and provide meaningful error messages
- Avoid deeply nested code - prefer early returns and guard clauses
- Remove unused imports, variables, and dead code
- Use meaningful commit messages that explain the "why" not just the "what"

### Pre-Commit Checklist

Before committing any code, ensure:

1. `npm test` passes with all tests green
2. `npm run lint` passes with zero warnings
3. `npm run check:types` passes with zero errors
4. `npm run prettier` has been run to format code
5. Code follows the project's TypeScript function definition rules
6. New features include appropriate test coverage
7. Bug fixes include regression tests

### Performance Considerations

- Avoid unnecessary re-renders in React components
- Use React.memo, useMemo, and useCallback appropriately
- Optimize bundle size by avoiding large dependencies when possible
- Consider lazy loading for non-critical components
- Profile performance-critical code paths

### Security Guidelines

- Validate all user inputs
- Sanitize data before rendering in the DOM
- Use HTTPS for all external API calls
- Avoid storing sensitive data in localStorage or sessionStorage
- Review dependencies for known security vulnerabilities
