# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Astro integration with a typed config: themes, default (or `system`), `data-*` attribute or `class`, storage key, default transition and duration.
- Inline head script that sets the theme before first paint, follows `prefers-color-scheme` live, syncs other tabs and re-applies the theme on `astro:before-swap`.
- `astro-eclipse/client`: `setTheme`, `toggleTheme`, `getTheme`, `getPreference`, `onThemeChange` and `defineTransition`.
- View Transitions runner with `circle`, `circle-inverse` and `fade`, an instant fallback, reduced-motion handling and a guard against Astro's own page transition.
