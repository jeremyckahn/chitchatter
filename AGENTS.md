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
- Run type checking with: `npm run check:types`
- Use explicit type annotations for function parameters and return types
- Avoid using `any` type - use proper types or `unknown` instead
- Use strict TypeScript configuration settings
- Define proper interfaces and types for complex data structures

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
