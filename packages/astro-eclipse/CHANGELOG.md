# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [1.5.0] - 2026-11-09

### Added

- `forcedTheme` option: a page with `<html data-eclipse-forced="dark">` shows that theme on first paint, after ClientRouter navigation and after `setTheme`, without touching the visitor's saved choice. `getTheme()` returns the forced theme, `getPreference()` the stored one, and `setTheme` stores without applying. `ThemeToggle`, `ThemeSelect` and `ThemeRadio` are disabled on a forced page. Adds about 45 B to the head script only when turned on.
- `disableCssTransitions` option: suppresses CSS transitions and animations for the frame of a theme change made through the client API, so elements with their own `transition` change with the reveal.
- `ThemeChange.forced`: the forced theme, or `undefined`.

### Changed

- The client API size budget is 4.7 kB (was 4.5 kB).

## [1.4.0] - 2026-11-09

### Added

- `ThemeRadio` in `astro-eclipse/components`: a native radio group (`<fieldset>` and `<legend>`) for the themes and `System`. It shows the visitor's preference, stays in sync with other controls, tabs and system mode, starts the reveal at the chosen radio, and takes the same props as `ThemeSelect`.
- `headless` option: any element with `data-eclipse-set="<theme>"` switches the theme on click, with optional `data-transition`, `data-duration` and `data-direction`. It adds one page script (about 270 B gzipped) only when turned on.
- `getSystemTheme()` and `themes` in `astro-eclipse/client`: the scheme the device prefers right now, and the configured theme names.

### Changed

- `package.json` lists `dist/client/headless.js` under `sideEffects` (it was `false`), so bundlers keep the headless page script.

## [1.3.0] - 2026-11-09

### Added

- Docs: a shadcn/ui guide, a `transition:persist` toggle recipe, a multi-page (no `ClientRouter`) guide, and a migration guide for astro-color-scheme, astro-theme-toggle and hand-written scripts.
- Docs: the Tailwind 4 snippets now state the versions they were built with.

### Changed

- Tests only, no change to the package code: branch coverage is 100% and enforced, and the public types have type tests.

## [1.2.0] - 2026-11-09

### Added

- `ThemeSelect` in `astro-eclipse/components`: a native `<select>` that lists the themes and a `System` option, shows the visitor's preference, stays in sync with other controls, tabs and system mode, and starts the reveal at the select. Props: `themes`, `system`, `labels`, `label`, `transition`, `duration`, `direction`, `class`.

## [1.1.0] - 2026-11-06

### Added

- `colorScheme` option: maps a theme to `light` or `dark` and sets `color-scheme` on `<html>`, so native controls and scrollbars match custom themes.
- `themeColor` option: maps a theme to a color and keeps `<meta name="theme-color">` in step, creating the tag when missing.
- Both are opt-in, apply before first paint, on ClientRouter swaps, on system and cross-tab changes and in `setTheme`, and add no code to the head script when unset.

### Changed

- Head script budget for a config with both options is 1 kB gzip (default config stays under 700 B).

## [1.0.0] - 2026-11-03

### Added

- Astro integration with a typed config: themes, default (or `system`), `data-*` attribute or `class`, storage key, default transition and duration.
- Inline head script that sets the theme before first paint, follows `prefers-color-scheme` live, syncs other tabs and re-applies the theme on `astro:before-swap`.
- `astro-eclipse/client`: `setTheme`, `toggleTheme`, `getTheme`, `getPreference`, `onThemeChange` and `defineTransition`.
- View Transitions runner with `circle`, `circle-inverse`, `wipe`, `diamond`, `iris`, `blinds`, `blur-circle`, `star`, `diagonal`, `diagonal-soft`, `split`, `scan`, `slide`, `zoom`, `square`, `triangle`, `sunburst`, `cross`, `heart`, `ripple`, `clock`, `curtain`, `stairs`, `mosaic`, `blur`, `flip`, `spin`, `cover`, `reveal` and `fade`, an instant fallback, reduced-motion handling and a guard against Astro's own page transition. `wipe`, `blinds`, `diagonal`, `diagonal-soft`, `split`, `scan`, `slide`, `curtain`, `stairs`, `flip`, `cover` and `reveal` take a `direction`.
- `astro-eclipse/components` with `ThemeToggle`: a real button whose accessible name states the current and next theme, with forced-colors styles, a `label` prop for the name, validated `themes` and attribute passthrough.
