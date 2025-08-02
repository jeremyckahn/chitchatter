# End-to-End Tests

This directory contains Playwright end-to-end tests for Chitchatter. These tests are designed to verify the application's functionality from a user's perspective.

## Prerequisites

Before running the tests, make sure you have:

1. Node.js installed (version 20.x recommended)
2. All dependencies installed: `npm install`
3. Playwright browsers installed: `npm run playwright:install`

## Running Tests

### Run all tests in headless mode (CI-friendly)

```bash
npm run test:e2e
```

### Run tests with UI mode for debugging

```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see the browser)

```bash
npm run test:e2e:headed
```

### Debug tests

```bash
npm run test:e2e:debug
```

### View test report

```bash
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── helpers/
│   └── test-helpers.ts      # Common utility functions
├── tests/
│   ├── accessibility.test.ts # Accessibility tests
│   ├── home.test.ts         # Home page tests
│   ├── room.test.ts         # Room functionality tests
│   └── settings.test.ts     # Settings and preferences tests
└── README.md                # This file
```

## Test Categories

### Home Page Tests (`tests/home.test.ts`)

- Page loading and basic UI elements
- Room creation functionality
- Room joining functionality
- Responsive design verification

### Room Tests (`tests/room.test.ts`)

- Chat messaging functionality
- User presence indicators
- Multi-user interactions
- Room persistence and reconnection

### Settings Tests (`tests/settings.test.ts`)

- Theme preferences
- User profile settings
- Sound/notification settings
- Settings persistence
- Import/export functionality

### Accessibility Tests (`tests/accessibility.test.ts`)

- WCAG compliance checks
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Color contrast verification

## Authoring Tests with Playwright Codegen

Playwright provides a code generation tool that can help you create tests by recording your interactions with the application. This is especially useful for creating new tests or understanding how to interact with complex UI elements.

### Using the Codegen Tool

1. **Start the development server** (this must be done manually before using codegen):

   ```bash
   npm run dev
   ```

2. **In a separate terminal, run the codegen tool**:

   ```bash
   npm run test:e2e:codegen
   ```

3. **Interact with your application** in the browser window that opens. The codegen tool will:
   - Record your clicks, typing, and navigation
   - Generate corresponding Playwright test code
   - Show the generated code in real-time

4. **Copy the generated code** and adapt it to your test files following the project's patterns and conventions.

### Tips for Using Codegen

- **Use meaningful interactions**: Focus on user workflows rather than random clicking
- **Use stable selectors**: The generated code may use brittle selectors - refactor to use text-based selectors or data-testid attributes
- **Break down complex flows**: Record smaller interactions and combine them into comprehensive tests
- **Clean up generated code**: Remove unnecessary waits and add meaningful assertions

### Codegen Limitations

- Generated code may need refactoring to follow project conventions
- Some dynamic content may require manual adjustments
- WebRTC features may not record properly and need manual implementation

## Writing New Tests

When adding new tests, follow these patterns:

1. **Use descriptive test names**:

   ```typescript
   test('should allow users to send messages', async ({ page }) => {
     // test implementation
   })
   ```

2. **Use the helper functions**:

   ```typescript
   import { sendMessage } from './helpers/test-helpers'

   await sendMessage(page, 'Hello world')
   ```

3. **Use proper selectors**:
   - Prefer text-based selectors: `page.getByText('Join public room')`
   - Use data-testid for specific elements
   - Avoid brittle CSS selectors

## CI Integration

Tests run automatically on:

- Every push
- Every pull request

The CI workflow:

1. Sets up the test environment
2. Installs dependencies
3. Installs Playwright browsers
4. Runs all tests in headless mode
5. Uploads test reports and artifacts

## Debugging Failed Tests

1. **Check the test report**: Failed tests generate detailed reports with screenshots and traces
2. **Run locally with UI mode**: `npm run test:e2e:ui`
3. **Use the Playwright Inspector**: `npm run test:e2e:debug`
4. **Check console output**: Tests capture console logs and errors

## Configuration

Test configuration is in `playwright.config.ts`:

- Base URL: `http://localhost:3000`
- Browsers: Chromium (others can be enabled in `playwright.config.ts`)
- Mobile viewports: Currently disabled (can be enabled in config)
- Headless mode enabled by default
- Automatic retries on CI (2 retries)
- Parallel execution enabled (1 worker on CI, unlimited locally)

## Best Practices

1. **Keep tests independent**: Each test should work in isolation
2. **Clean up after tests**: Clear local storage, close contexts
3. **Use meaningful assertions**: Verify user-visible behavior
4. **Handle timing properly**: Use Playwright's auto-waiting features
5. **Test realistic scenarios**: Focus on actual user workflows
6. **Maintain test data**: Use consistent test data across tests

## Troubleshooting

### Tests fail locally but pass in CI

- Check Node.js version matches CI
- Clear browser cache and storage
- Ensure all dependencies are up to date

### Timeout errors

- Increase timeout for slow operations
- Check if the dev server is running
- Verify network conditions

### Element not found

- Use more specific selectors
- Wait for elements to be visible
- Check for dynamic content loading

### WebRTC connection issues

- Some WebRTC features may not work in headless mode
- Use headed mode for debugging WebRTC tests
- Mock WebRTC connections when appropriate
