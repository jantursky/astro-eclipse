# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

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
