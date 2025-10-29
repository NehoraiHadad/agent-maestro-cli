# Repository Guidelines

## Project Structure & Module Organization
AgentMaestro is a TypeScript CLI that emits compiled output in `dist/`. The main entry point is `src/cli/index.ts`, with command registrations under `src/cli/commands`. Orchestration logic and state live in `src/domain` and `src/features`, while reusable utilities sit in `src/shared`. Shell plugins and adapters belong in `plugins/`, with supporting specs in `docs/`. Tests and demo scripts reside in `tests/`; keep generated artifacts confined to `dist/` and run-time logs in `logs/`.

## Build, Test, and Development Commands
- `npm run build` — transpile TypeScript using the project `tsconfig`.
- `npm run dev` — build once, then run the CLI with Node watch mode for interactive debugging.
- `npm run build:watch` — continuously rebuild during TypeScript edits.
- `npm start` — execute `dist/cli/index.js` exactly as published.
- `npm test` — invoke `tests/run-tests.js`, which chains the Node suites and shell-based scenarios; ensure Node ≥18 and Bash are present.

## Coding Style & Naming Conventions
Follow modern TypeScript with ECMAScript modules, 2-space indentation, and trailing commas on multi-line literals. Export command classes in PascalCase (e.g., `StartCommand`) and name helper modules with dashed or camelCase filenames that reflect their scope. Prefer async/await over callbacks, keep side effects inside CLI layers, and route colored output through the `chalk` helpers in `src/shared`. Run `npm run build` before committing to satisfy type-checking.

## Testing Guidelines
Name new test assets `test-*.js` or `test-*.sh` so the harness auto-discovers them. Mirror real CLI flows—invoke `maestro delegate`, `maestro start`, etc.—and assert on transcript snippets rather than entire buffers. Add focused unit tests in `tests/` when domain logic changes, and document any required environment variables inside the test file header. Always run `npm test` locally and include the outcome when filing a PR.

## Commit & Pull Request Guidelines
Adopt the established Conventional Commit prefixes (`feat:`, `refactor:`, `docs:`) to keep history searchable; limit the subject to one change set. Pull requests should explain the agent workflow touched, link to updated docs, and outline validation steps run. Attach gifs or terminal captures for user-facing CLI changes and ensure new plugins or skills include configuration notes in `docs/`.

## Agent Integration Notes
Start new agent backends in `plugins/`, wiring them through the relevant command in `src/cli/commands`. Document expected environment variables and add a smoke script in `tests/` that covers the new delegation path.
