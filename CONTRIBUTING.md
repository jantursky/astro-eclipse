# Contributing

Thanks for helping. Bug reports, docs fixes and pull requests are all welcome.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- A transition that looks wrong in one browser may be a missing API there. Check the browser support of `document.startViewTransition` before you file a bug about the animation itself.

## Setup

You need [Bun](https://bun.sh) 1.3+ and Node.js 24. Astro 7 needs Node 22.23.4 or newer, and CI runs on 24.

```sh
bun install
bunx playwright install chromium firefox webkit   # once, for the e2e tests
bun run --filter example dev                      # demo app, reading the library's source
```

## Where things live

| path                             |                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/astro-eclipse/src`     | The integration (`config.ts`, `head-script.ts`, `index.ts`) and the client (`client/`). |
| `packages/astro-eclipse/test`    | Unit tests (Vitest with happy-dom).                                                     |
| `packages/astro-eclipse/scripts` | Package checks: the packed tarball test and the head script measurement.                |
| `apps/example`                   | The demo, its Playwright e2e tests in `e2e/`.                                           |
| `apps/docs`                      | The docs site. It copies the library's CHANGELOG at build time.                         |
| `design/`                        | The design system: `DESIGN.md` and `tokens.css`. Every UI surface uses these tokens.    |

## Checks

```sh
bun run check                                   # format, lint, typecheck, unit tests with coverage
bun run build                                   # library, fails over the size budgets
bun run lint:package && bun run test:pack       # after build: publint, types, install the tarball
bun run --filter example test:e2e               # after building the demo, drives it with Playwright
bun run --filter docs build                     # the docs site
```

CI runs all of them on every pull request, and the library's tests against the oldest and newest supported Astro versions.

## Conventions

- TypeScript strict. Prettier formats everything (`bun run format`).
- Every behavior change comes with a test.
- Theme names, attributes and storage keys are validated in `config.ts`. Keep the validation there when you add an option.
- Add a line under `## [Unreleased]` in `packages/astro-eclipse/CHANGELOG.md` for anything users will notice.
- Breaking changes need a new major version and an entry under **Changed**.

## License

By contributing you agree that your contributions are licensed under the MIT license.
