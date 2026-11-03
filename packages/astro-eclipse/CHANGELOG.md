# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Astro integration with a typed config: themes, default (or `system`), `data-*` attribute or `class`, storage key, default transition and duration.
- Inline head script that sets the theme before first paint, follows `prefers-color-scheme` live, syncs other tabs and re-applies the theme on `astro:before-swap`.
- `astro-eclipse/client`: `setTheme`, `toggleTheme`, `getTheme`, `getPreference`, `onThemeChange` and `defineTransition`.
- View Transitions runner with `circle`, `circle-inverse`, `wipe`, `diamond`, `iris`, `blinds` and `fade`, an instant fallback, reduced-motion handling and a guard against Astro's own page transition. `wipe` and `blinds` take a `direction`.
- `astro-eclipse/components` with `ThemeToggle`: a real button whose accessible name states the current and next theme, with forced-colors styles.
